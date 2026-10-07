import {
  districtsOf,
  festivalPeriodLabel,
  filterFestivals,
  periodRange,
  type Festival,
} from '../festivals';

// 2026-10-01 (목)
const NOW = new Date(2026, 9, 1, 12);

const fest = (overrides: Partial<Festival>): Festival => ({
  id: 'x',
  title: '축제',
  startDate: '2026-10-03',
  endDate: '2026-10-04',
  region: '서울',
  district: '마포구',
  place: null,
  imageUrl: null,
  isFree: null,
  fee: null,
  target: null,
  category: null,
  link: null,
  source: 'seoul-culture',
  ...overrides,
});

describe('periodRange', () => {
  it('이번 주말은 다가오는 토·일', () => {
    expect(periodRange('weekend', NOW)).toEqual(['2026-10-03', '2026-10-04']);
    expect(periodRange('weekend', new Date(2026, 9, 3))).toEqual(['2026-10-03', '2026-10-04']);
    expect(periodRange('weekend', new Date(2026, 9, 4))).toEqual(['2026-10-04', '2026-10-04']);
  });

  it('2주 / 이번 달 / 전체', () => {
    expect(periodRange('two-weeks', NOW)).toEqual(['2026-10-01', '2026-10-14']);
    expect(periodRange('month', NOW)).toEqual(['2026-10-01', '2026-10-31']);
    expect(periodRange('all', NOW)[0]).toBe('2026-10-01');
  });
});

describe('filterFestivals', () => {
  const list = [
    fest({ id: 'weekend', startDate: '2026-10-03', endDate: '2026-10-04' }),
    fest({
      id: 'ongoing',
      startDate: '2026-09-20',
      endDate: '2026-10-10',
      region: '경기',
      district: '수원시',
    }),
    fest({
      id: 'later',
      startDate: '2026-10-20',
      endDate: '2026-10-21',
      region: '인천',
      district: '강화군',
    }),
  ];
  const run = (o: Partial<Parameters<typeof filterFestivals>[1]>) =>
    filterFestivals(list, { region: '', district: '', period: 'all', search: '', ...o }, NOW).map(
      (f) => f.id
    );

  it('기간이 겹치는 축제 (진행 중 포함)', () => {
    expect(run({ period: 'weekend' })).toEqual(['weekend', 'ongoing']);
    expect(run({ period: 'month' })).toEqual(['weekend', 'ongoing', 'later']);
  });

  it('지역·시군구·검색', () => {
    expect(run({ region: '경기' })).toEqual(['ongoing']);
    expect(run({ district: '강화군' })).toEqual(['later']);
    expect(run({ search: '수원' })).toEqual(['ongoing']);
  });

  it('시·구 목록', () => {
    expect(districtsOf(list, '')).toEqual([
      { name: '강화군', count: 1 },
      { name: '마포구', count: 1 },
      { name: '수원시', count: 1 },
    ]);
    expect(districtsOf(list, '경기')).toEqual([{ name: '수원시', count: 1 }]);
  });
});

describe('festivalPeriodLabel', () => {
  it('진행 중 / 다가오는 / 마지막 날', () => {
    expect(festivalPeriodLabel(fest({ startDate: '2026-09-20', endDate: '2026-10-10' }), NOW)).toBe(
      '진행 중 · 10.10까지'
    );
    expect(festivalPeriodLabel(fest({}), NOW)).toBe('D-2 · 10.3 ~ 10.4');
    expect(festivalPeriodLabel(fest({ startDate: '2026-10-02', endDate: '2026-10-02' }), NOW)).toBe(
      '내일 · 10.2'
    );
    expect(festivalPeriodLabel(fest({ startDate: '2026-09-30', endDate: '2026-10-01' }), NOW)).toBe(
      '오늘 마지막 날'
    );
  });
});
