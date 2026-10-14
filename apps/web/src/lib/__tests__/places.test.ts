import { mapSearchUrl, parseAgeRule, parsePlacesText, splitNames, tourFits } from '../places';
import type { Child } from '../eligibility';

const SAMPLE = `가본곳은 지역명 a / b 중 b 오른쪽
  ☆ 또갈곳
 ◇ 아이는안가본곳
강서 : 깅꼬커피 / 어나더사이드 ☆서울식물원 별빛과학관(개기일식/천체관측실)
양천 : 생명과학관 연의숲체험
종로 : 국립기상박물관 역사박물관
픽사하우스삼청(안국) / ☆경찰박물관 경복궁
강남 : 어린이회관/ ◇맘마미아 ☆봉은사
--------
파주 : 뮤지엄헤이 / 헤이리마을 ☆뮌스터담(눈썰매장/물놀이)
◇마장호수 ☆나눔농장
인천 중구 : 학생과학관 / 생활사전시관 인천 ☆ 파라다이스시티
경주 : 세계문화엑스포 기념관, 살롱헤리티지, mcy테마파크 신라당 코스믹리조트

초3 : 조선일보뉴지엄
6세 : 경기 평택 요구르트
모든연령 : 서울우유양주공장
11세 : 농심 구미 부산 안성
‐---
1월 산천어 송어
춘천에어쇼 (5~7월)
10월 여의도 불꽃 사천에어쇼`;

describe('메모장 형식 읽기', () => {
  const data = parsePlacesText(SAMPLE);
  const place = (name: string) => data.places.find((p) => p.name === name);

  it('설명 줄은 건너뛰고, / 왼쪽은 가 볼 곳, 오른쪽은 가 본 곳', () => {
    expect(place('깅꼬커피')).toMatchObject({ region: '강서', visited: false });
    expect(place('어나더사이드')).toMatchObject({ visited: true, revisit: false });
    expect(place('서울식물원')).toMatchObject({ visited: true, revisit: true });
    expect(place('맘마미아')).toMatchObject({ visited: true, kidNotYet: true });
    expect(data.places.some((p) => p.name.includes('가본곳'))).toBe(false);
  });

  it('/ 가 없는 줄은 모두 가 볼 곳, 괄호 안의 / 는 나누지 않는다', () => {
    expect(place('생명과학관')?.visited).toBe(false);
    expect(place('별빛과학관(개기일식/천체관측실)')?.visited).toBe(true);
    expect(place('뮌스터담(눈썰매장/물놀이)')?.revisit).toBe(true);
  });

  it('지역 없이 이어진 줄은 앞 지역·앞 줄이 끝난 쪽을 따른다', () => {
    expect(place('픽사하우스삼청(안국)')).toMatchObject({ region: '종로', visited: false });
    expect(place('경찰박물관')).toMatchObject({ region: '종로', revisit: true });
    expect(place('나눔농장')).toMatchObject({ region: '파주', visited: true, revisit: true });
    expect(place('마장호수')).toMatchObject({ region: '파주', kidNotYet: true });
  });

  it('구분선 위는 서울, 아래는 근교·지방', () => {
    expect(place('봉은사')?.area).toBe('seoul');
    expect(place('헤이리마을')?.area).toBe('nearby');
  });

  it('띄어 쓴 표시·지역 이름·쉼표 목록', () => {
    expect(place('파라다이스시티')).toMatchObject({ revisit: true });
    expect(place('생활사전시관 (인천)')).toBeDefined();
    expect(place('세계문화엑스포 기념관')).toBeDefined();
    expect(place('코스믹리조트')).toBeDefined();
  });

  it('나이 제한 견학', () => {
    expect(data.tours.map((t) => `${t.label}:${t.name}`)).toEqual([
      '초3:조선일보뉴지엄',
      '6세:경기 평택 요구르트',
      '모든연령:서울우유양주공장',
      '11세:농심 (구미·부산·안성)',
    ]);
    expect(parseAgeRule('초3')).toEqual({ kind: 'grade', min: 3 });
    expect(parseAgeRule('초등')).toEqual({ kind: 'grade', min: 1, max: 6 });
    expect(parseAgeRule('중학생')).toEqual({ kind: 'grade', min: 7 });
    expect(parseAgeRule('6세')).toEqual({ kind: 'age', min: 6 });
    expect(parseAgeRule('모든연령')).toEqual({ kind: 'any' });
  });

  it('달마다 열리는 축제 (기간 표시 포함)', () => {
    expect(data.months.map((m) => `${m.months.join(',')}:${m.name}`)).toEqual([
      '1:산천어',
      '1:송어',
      '5,6,7:춘천에어쇼',
      '10:여의도 불꽃',
      '10:사천에어쇼',
    ]);
  });
});

describe('메모 도우미', () => {
  it('& 로 이어진 이름과 띄어 쓴 괄호', () => {
    expect(splitNames('청년몰 & 실감형 어뮤즈스파 (진주)').map((t) => t.name)).toEqual([
      '청년몰 & 실감형',
      '어뮤즈스파 (진주)',
    ]);
  });

  it('지도 검색은 괄호 설명을 빼고 지역을 붙인다', () => {
    expect(mapSearchUrl({ name: '공예박물관(안국)', region: '종로' })).toBe(
      `https://map.naver.com/p/search/${encodeURIComponent('종로 공예박물관')}`
    );
  });

  it('견학 나이 제한을 아이마다 따진다', () => {
    const kids: Child[] = [
      { id: 'a', name: '첫째', birthDate: '2019-04-20' },
      { id: 'b', name: '둘째', birthDate: '2024-09-29' },
    ];
    const today = new Date(2026, 9, 11);
    expect(tourFits({ kind: 'grade', min: 1 }, kids, today, ['첫째', '둘째'])).toEqual([
      { childName: '첫째', ok: true },
      { childName: '둘째', ok: false, from: '2031년 3월부터' },
    ]);
    expect(tourFits({ kind: 'grade', min: 3 }, kids, today, ['첫째', '둘째'])[0]).toEqual({
      childName: '첫째',
      ok: false,
      from: '2028년 3월부터',
    });
    expect(tourFits({ kind: 'age', min: 6 }, kids, today, ['첫째', '둘째'])[0].ok).toBe(true);
  });
});
