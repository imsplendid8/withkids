import {
  childFacts,
  evaluateProgram,
  matchesEligibility,
  parseTarget,
  referenceDate,
  type Child,
} from '../eligibility';

// 공개 저장소라 실제 가족 생일 대신 같은 학년·나이대의 예시 생일을 쓴다.
// 기준일 2026-10-15: 큰아이 만 7세·초등 1학년, 작은아이 만 2세·취학 전
const ON = new Date(2026, 9, 15);
const BIG: Child = { id: 'big', name: '큰아이', birthDate: '2019-05-10' };
const SMALL: Child = { id: 'small', name: '작은아이', birthDate: '2024-08-15' };

const admits = (text: string) => {
  const rule = parseTarget(text);
  return [BIG, SMALL].map((c) => rule.admits(childFacts(c.birthDate, ON)));
};

describe('childFacts', () => {
  it('만 나이·개월·학년을 계산한다', () => {
    expect(childFacts('2019-05-10', ON)).toMatchObject({ age: 7, grade: 1, birthYear: 2019 });
    expect(childFacts('2024-08-15', ON)).toMatchObject({ age: 2, months: 26, grade: -4 });
  });

  it('생일 전날까지는 나이가 오르지 않는다', () => {
    expect(childFacts('2019-10-16', ON).age).toBe(6);
    expect(childFacts('2019-10-15', ON).age).toBe(7);
  });

  it('학년은 3월에 바뀐다', () => {
    expect(childFacts('2019-05-10', new Date(2027, 1, 28)).grade).toBe(1);
    expect(childFacts('2019-05-10', new Date(2027, 2, 1)).grade).toBe(2);
  });

  it('연 나이 기준을 고를 수 있다', () => {
    expect(childFacts('2019-05-10', ON, 'year').defaultAge).toBe(7);
    expect(childFacts('2019-11-10', ON, 'year').defaultAge).toBe(7);
    expect(childFacts('2019-11-10', ON).defaultAge).toBe(6);
  });
});

describe('parseTarget — 실제 서울시 이용대상 문구', () => {
  // [문구, 큰아이(초1·7세), 작은아이(2세)]
  const cases: Array<[string, boolean, boolean]> = [
    // 나이 조건 없음 / 가족
    ['제한없음', true, true],
    ['가족', true, true],
    ['제한없음(서울시민 누구나)', true, true],
    ['가족(보호자 참여 필수), 초등학생(초등학생 자녀가 있는 가족)', true, true],
    // 보호자 규칙은 나이 제한이 아니다
    ['제한없음(초등6학년까지 보호자 동반 필수)', true, true],
    ['제한없음(초등학생 이하 동반시 보호자 동행 필수)', true, true],
    ['제한없음(8세미만 보호자 포함 최소 2명 예약)', true, true],
    ['제한없음(미취학 아동은 보호자 동반 필수 입니다.)', true, true],
    ['가족(13세미만과 고령인경우 보호자1인당1인동반), 성인, 어르신, 청소년', true, true],
    ['성인, 유아(영유아는 보호자 1인 동반 필수), 청소년(중고등학생), 초등학생', true, true],
    // 큰아이만
    ['초등학생', true, false],
    ['제한없음(초등생 이상 ※미취학 아동 참여 불가)', true, false],
    ['제한없음(단, 초등학생 이상 ※ 초등학교 4학년까지는 보호자 동반 필수)', true, false],
    ['성인(성인), 청소년(중,고등학생), 초등학생(2019년생~2014년생)', true, false],
    ['가족(유아. 초등자녀를 둔 가족(2014~2020년생까지))', true, false],
    ['가족(6세이상 어린이 동반 가족)', true, false],
    ['가족(초등생 1~3학년 1명, 보호자 1명)', true, false],
    ['어린이(초등1~3학년)', true, false],
    ['초등학생(1~3학년)', true, false],
    ['어린이(초등학교 1, 2, 3학년)', true, false],
    ['가족(만3세 이상 유아 및 초등학교 저학년 어린이와 이를 동반한 보호자)', true, false],
    ['가족(4~11세 가족)', true, false],
    ['어린이(7세~초등학생(보호자 동반 필수))', true, false],
    ['어린이(만 4세~초등학생)', true, false],
    ['가족(6세이상~성인, 초등 2학년 이하 보호자 동반신청 필수)', true, false],
    [
      '제한없음(7Km 산행에 지장이 없는 분 / 성인(69세 이하) / 초 1년 이상=미성년자는 보호자 동반 필수)',
      true,
      false,
    ],
    ['성인(초등생부터 가능, 저학년은 보호자 동반 필수)', true, false],
    ['어린이(6~7세), 초등학생(8~13세)', true, false],
    ['초등학생(초등 1-2학년 어린이 동반 가족)', true, false],
    ['가족(초교생 이상,부부,성인)', true, false],
    // 작은아이만
    ['유아', false, true],
    ['유아(유아를 동반한 가족)', false, true],
    ['유아(영아(36개월 미만) 동반 가족)', false, true],
    ['가족(만2세이상 자녀동반 가족), 유아(유아단체)', true, true],
    // 둘 다
    ['가족(유아, 초등 가족)', true, true],
    ['어린이, 유아', true, true],
    ['가족(유아ㆍ어린이 동반 가족)', true, true],
    ['제한없음(일반인, 소외계층)', true, true],
    ['제한없음(유아 및 노인 등 동반시 보호자 필수 참석)', true, true],
    ['유아(유아.초등 저학년 동반 부모 )', true, true],
    ['유아(유아를 동반한 초등 동반 가족)', true, true],
    // 둘 다 안 됨
    ['성인', false, false],
    ['성인, 청소년', false, false],
    ['청소년(중고등학생 단체)', false, false],
    ['유아(만5세이상), 초등학생(3학년 이상)', false, false],
    ['유아(5~7세)', false, false],
    ['가족(5~7세 유아)', false, false],
    ['유아(6-7세 미취학 아동)', false, false],
    ['유아(2020년생~2023년생)', false, false],
    ['초등학생(3~6학년)', false, false],
    ['초등학생(4-6학년 학급(반별신청), 돌봄단체)', false, false],
    ['유아(어린이집 (5~7세))', false, false],
    ['제한없음(유치원 또는 어린이집 기관)', false, false],
    ['제한없음(일반인 13세 이상 )', false, false],
    ['제한없음(청소년 이상)', false, false],
    ['제한없음(초등 고학년 이상 누구나)', false, false],
    ['성인(체험자가 부모일 경우 유아동반 불가), 청소년(중고등학생 이상)', false, false],
    ['성인(유아ㆍ어린이 양육자(엄마,아빠,할머니,고모, 이모 등))', false, false],
    ['성인(어린이는초등5학년이상보호자와함께)', false, false],
    ['가족(자녀 : 초등학교 3학년 이상), 성인', false, false],
    ['가족(난임), 성인(난임), 여성(난임부부), 주부(난임부부 )', false, false],
    ['청년(만 19세 ~ 39세)', false, false],
    ['어린이(8~11세)', false, false],
  ];

  it.each(cases)('%s → 큰아이 %s, 작은아이 %s', (text, big, small) => {
    expect(admits(text)).toEqual([big, small]);
  });

  it('문구가 없으면 판단하지 않는다', () => {
    expect(parseTarget(null).known).toBe(false);
    expect(parseTarget('').known).toBe(false);
  });

  it('보호자가 함께 참여하는 형태인지 구분한다', () => {
    expect(parseTarget('가족(4~11세 가족)').adultsJoin).toBe(true);
    expect(parseTarget('제한없음').adultsJoin).toBe(true);
    expect(parseTarget('유아(유아를 동반한 가족)').adultsJoin).toBe(true);
    expect(parseTarget('초등학생(1~3학년)').adultsJoin).toBe(false);
    expect(parseTarget('유아').adultsJoin).toBe(false);
  });
});

describe('필터', () => {
  const evaluate = (text: string) => evaluateProgram(text, [BIG, SMALL], ON);
  const passes = (text: string) =>
    (['family', 'kids', 'with:big', 'only:big', 'with:small', 'only:small'] as const).filter((f) =>
      matchesEligibility(evaluate(text), f)
    );

  it('온 가족: 나이 조건 없거나 가족 대상이고 아이 모두 참여', () => {
    expect(passes('제한없음')).toEqual(['family', 'kids', 'with:big', 'with:small']);
    expect(passes('가족(유아, 초등 가족)')).toEqual(['family', 'kids', 'with:big', 'with:small']);
  });

  it('아이 모두 참여하지만 아이들만 가는 프로그램은 온 가족이 아니다', () => {
    expect(passes('어린이, 유아')).toEqual(['kids', 'with:big', 'with:small']);
  });

  it('큰아이만', () => {
    expect(passes('가족(4~11세 가족)')).toEqual(['with:big', 'only:big']);
    expect(passes('초등학생(1~3학년)')).toEqual(['with:big', 'only:big']);
  });

  it('작은아이만', () => {
    expect(passes('유아')).toEqual(['with:small', 'only:small']);
  });

  it('아무도 못 가거나 정보가 없으면 전체 외에는 걸러진다', () => {
    expect(passes('성인')).toEqual([]);
    expect(passes('')).toEqual([]);
    expect(matchesEligibility(evaluate(''), 'all')).toBe(true);
  });

  it('등록된 아이가 없으면 전체만 보인다', () => {
    const result = evaluateProgram('제한없음', [], ON);
    expect(matchesEligibility(result, 'all')).toBe(true);
    expect(matchesEligibility(result, 'family')).toBe(false);
  });

  it('참여 시점 나이로 판단한다: 지난 날짜면 오늘, 앞날이면 그날', () => {
    expect(referenceDate('2026-01-01', ON)).toBe(ON);
    expect(referenceDate(null, ON)).toBe(ON);
    expect(referenceDate('2027-03-02', ON)).toEqual(new Date(2027, 2, 2));
    // 3월이 지나면 2학년 → 1학년 대상에서 빠진다
    const result = evaluateProgram('초등학생(1학년)', [BIG], referenceDate('2027-03-02', ON));
    expect(result.children[0].eligible).toBe(false);
  });
});
