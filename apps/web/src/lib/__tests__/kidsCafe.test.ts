import { isSeoulKidsCafe } from '../localApi';

describe('isSeoulKidsCafe', () => {
  it('이름이나 기관에 서울형 키즈카페가 있으면', () => {
    expect(
      isSeoulKidsCafe({ programName: '서울형 키즈카페 도봉구 쌍문2동점', institutionName: 'x' })
    ).toBe(true);
    expect(
      isSeoulKidsCafe({ programName: '10월 운영 안내', institutionName: '서울형키즈카페 강서구' })
    ).toBe(true);
    expect(
      isSeoulKidsCafe({ programName: '어린이 목공 교실', institutionName: '서울시립과학관' })
    ).toBe(false);
  });
});
