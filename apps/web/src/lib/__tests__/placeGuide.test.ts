import { PLACE_CATEGORIES } from '@/data/placesGuide';
import {
  DEFAULT_GUIDE_FILTER,
  EMPTY_MY_PLACES,
  GUIDE_FESTIVALS,
  GUIDE_PLACES,
  GUIDE_TOURS,
  MY_PLACES_KEY,
  filterGuide,
  findGuidePlace,
  groupByArea,
  importMarksFromMemo,
  loadMyPlaces,
  makeCustomPlace,
  setMark,
} from '../placeGuide';

const OCT = new Date(2026, 9, 14);

describe('가볼 만한 곳 목록', () => {
  it('이름이 겹치지 않고 종류·달이 올바르다', () => {
    const ids = GUIDE_PLACES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of GUIDE_PLACES) {
      expect(PLACE_CATEGORIES).toContain(p.category);
      expect(p.indoor || p.outdoor).toBe(true);
    }
    for (const f of GUIDE_FESTIVALS) for (const m of f.months) expect(m >= 1 && m <= 12).toBe(true);
    expect(GUIDE_TOURS.every((t) => t.name && t.label)).toBe(true);
  });

  it('오타·지역을 바로잡은 곳', () => {
    expect(findGuidePlace('바람의원덕', '경남 거제')).toMatchObject({
      name: '바람의 언덕',
      sigungu: '거제시',
    });
    expect(findGuidePlace('사천항공우주과학관', '경상북도')).toMatchObject({ sido: '경남' });
    expect(findGuidePlace('현대어린이책미술관', '용인')).toMatchObject({ sigungu: '성남시' });
    expect(findGuidePlace('월화원', '수원')).toBe(findGuidePlace('수원월화원', '수원'));
  });

  it('같은 이름은 메모의 지역으로 고른다', () => {
    expect(findGuidePlace('자연사박물관', '서대문')?.name).toBe('서대문자연사박물관');
    expect(findGuidePlace('자연사박물관', '강화')?.name).toBe('강화자연사박물관');
    expect(findGuidePlace('어린이박물관', '일산')?.name).toBe('고양어린이박물관');
    expect(findGuidePlace('어린이박물관', '인천 미추홀구')?.name).toBe('인천어린이박물관');
  });
});

describe('내 표시', () => {
  beforeEach(() => localStorage.clear());

  it('메모에서 가 본 곳·또 갈 곳 표시만 가져온다', () => {
    const memo = `강서 : 깅꼬커피 / 어나더사이드 ☆서울식물원
파주 : 뮤지엄헤이 / ◇더티트렁크
중랑 : / 장미축제(5월)`;
    const { data, matched, unmatched } = importMarksFromMemo(EMPTY_MY_PLACES, memo);
    const mark = (name: string, region: string) => data.marks[findGuidePlace(name, region)!.id];
    expect(matched).toBe(5);
    expect(mark('서울식물원', '강서')).toMatchObject({ visited: true, revisit: true });
    expect(mark('깅꼬커피', '강서')).toMatchObject({ want: true });
    expect(mark('더티트렁크', '파주')).toMatchObject({ visited: true, kidNotYet: true });
    expect(unmatched).toEqual(['중랑 장미축제(5월)']);
  });

  it('예전에 메모를 그대로 붙여넣어 둔 데이터를 옮긴다', () => {
    localStorage.setItem(
      MY_PLACES_KEY,
      JSON.stringify({
        places: [
          {
            id: 'x',
            name: '서울식물원',
            region: '강서',
            area: 'seoul',
            visited: true,
            revisit: true,
            kidNotYet: false,
          },
        ],
        tours: [],
        months: [],
      })
    );
    const data = loadMyPlaces();
    expect(data.version).toBe(2);
    expect(data.marks[findGuidePlace('서울식물원', '강서')!.id]).toMatchObject({ revisit: true });
  });

  it('표시를 모두 끄면 지운다', () => {
    const id = GUIDE_PLACES[0].id;
    const on = setMark(EMPTY_MY_PLACES, id, { visited: true });
    expect(on.marks[id]).toEqual({ visited: true });
    expect(setMark(on, id, { visited: false }).marks[id]).toBeUndefined();
  });
});

describe('고르기', () => {
  const marks = {};
  const pick = (patch: Partial<typeof DEFAULT_GUIDE_FILTER>) =>
    filterGuide(GUIDE_PLACES, marks, { ...DEFAULT_GUIDE_FILTER, ...patch }, OCT);

  it('지역·종류·실내·계절', () => {
    expect(pick({ region: 'seoul' }).every((p) => p.sido === '서울')).toBe(true);
    expect(pick({ region: 'metro' }).every((p) => ['경기', '인천'].includes(p.sido))).toBe(true);
    expect(pick({ category: '과학관' }).every((p) => p.category === '과학관')).toBe(true);
    expect(pick({ indoor: true }).every((p) => p.indoor)).toBe(true);
    expect(pick({ thisSeason: true }).map((p) => p.name)).toContain('화담숲');
    expect(pick({ search: '과학관 노원' }).map((p) => p.name)).toContain('노원천문우주과학관');
    expect(pick({ search: '노원' }).length).toBeGreaterThan(3);
  });

  it('내가 추가한 곳도 함께 고르고 서울부터 묶는다', () => {
    const mine = makeCustomPlace({
      name: '우리 동네 놀이터',
      sido: '경기',
      sigungu: '고양시',
      category: '공원·자연',
    });
    const groups = groupByArea(filterGuide([...GUIDE_PLACES, mine], {}, DEFAULT_GUIDE_FILTER, OCT));
    expect(groups[0].area.startsWith('서울')).toBe(true);
    expect(groups.find((g) => g.area === '경기 고양시')?.places).toContainEqual(mine);
  });
});
