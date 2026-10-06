import { ageFits, filterPaid, normalizeGugun, type PaidFilter, type PaidItem } from '../paid';
import type { Child } from '../eligibility';

const NOW = new Date(2026, 9, 6);
const BIG: Child = { id: 'big', name: '큰아이', birthDate: '2019-05-10' }; // 만 7세
const SMALL: Child = { id: 'small', name: '작은아이', birthDate: '2024-08-15' }; // 만 2세

const item = (overrides: Partial<PaidItem>): PaidItem => ({
  id: 'x',
  source: 'nolbal',
  title: '체험',
  sido: '서울',
  gugun: '강남',
  place: null,
  address: null,
  imageUrl: null,
  url: 'https://nolbal.com/content/detail/1',
  price: { original: 20000, sale: 15000, percent: 25, option: null },
  minAge: null,
  maxAge: null,
  rating: 4.5,
  reviewCount: 10,
  sameDay: true,
  availableUntil: null,
  categories: ['키즈카페'],
  ...overrides,
});

const base: PaidFilter = {
  region: '',
  gugun: '',
  category: '',
  who: 'all',
  sameDayOnly: false,
  source: '',
  search: '',
  sort: 'recommended',
};

describe('유료 체험', () => {
  it('구 이름을 같게 묶는다', () => {
    expect(normalizeGugun('강남구')).toBe('강남');
    expect(normalizeGugun('부천')).toBe('부천');
    expect(normalizeGugun('중구')).toBe('중구');
    expect(normalizeGugun(null)).toBeNull();
  });

  it('아이 나이가 추천 나이 안인지 (정보 없으면 누구나)', () => {
    expect(ageFits(item({ minAge: 4, maxAge: 13 }), BIG, NOW)).toBe(true);
    expect(ageFits(item({ minAge: 4, maxAge: 13 }), SMALL, NOW)).toBe(false);
    expect(ageFits(item({}), SMALL, NOW)).toBe(true);
  });

  it('지역·구·당일·아이 필터', () => {
    const list = [
      item({ id: 'a', gugun: '강남구', minAge: 1, maxAge: 13 }),
      item({ id: 'b', sido: '경기', gugun: '부천', sameDay: false }),
      item({ id: 'c', minAge: 5, maxAge: 13 }),
    ];
    const ids = (f: Partial<PaidFilter>) =>
      filterPaid(list, { ...base, ...f }, [BIG, SMALL], NOW)
        .map((i) => i.id)
        .sort();
    expect(ids({ region: '서울' })).toEqual(['a', 'c']);
    expect(ids({ gugun: '강남' })).toEqual(['a', 'c']);
    expect(ids({ sameDayOnly: true })).toEqual(['a', 'c']);
    expect(ids({ who: 'kids' })).toEqual(['a', 'b']);
    expect(ids({ who: 'child:big' })).toEqual(['a', 'b', 'c']);
  });

  it('정렬: 추천(평점×후기) / 할인율 / 가격', () => {
    const list = [
      item({
        id: 'few',
        rating: 5,
        reviewCount: 1,
        price: { original: 1, sale: 30000, percent: 10, option: null },
      }),
      item({
        id: 'many',
        rating: 4.8,
        reviewCount: 300,
        price: { original: 1, sale: 9000, percent: 50, option: null },
      }),
      item({
        id: 'mid',
        rating: 4.5,
        reviewCount: 40,
        price: { original: 1, sale: 12000, percent: 30, option: null },
      }),
    ];
    const order = (sort: PaidFilter['sort']) =>
      filterPaid(list, { ...base, sort }, [], NOW).map((i) => i.id);
    expect(order('recommended')).toEqual(['many', 'mid', 'few']);
    expect(order('discount')).toEqual(['many', 'mid', 'few']);
    expect(order('price')).toEqual(['many', 'mid', 'few']);
  });
});
