import {
  collectFestivals,
  districtFromAddress,
  mapSeoulCulture,
  mapTourItem,
  mergeFestivals,
  normalizeServiceKey,
  type Festival,
} from './festivals';

const seoulRow = {
  CODENAME: '축제-문화/예술',
  GUNAME: '마포구',
  TITLE: '2026 마포 &#39;가을&#39; 축제',
  DATE: '2026-10-10~2026-10-12',
  PLACE: '월드컵공원',
  USE_TRGT: '누구나',
  USE_FEE: '',
  ORG_LINK: 'https://example.org/fest',
  MAIN_IMG: 'https://culture.seoul.go.kr/a.jpg',
  STRTDATE: '2026-10-10 00:00:00.0',
  END_DATE: '2026-10-12 00:00:00.0',
  IS_FREE: '무료',
};

const tourItem = {
  contentid: '123',
  title: '수원화성문화제',
  addr1: '경기도 수원시 팔달구 정조로 825',
  addr2: '(남창동)',
  eventstartdate: '20261009',
  eventenddate: '20261011',
  firstimage: 'http://tong.visitkorea.or.kr/a.jpg',
};

describe('festivals', () => {
  it('서울 문화행사 중 축제만 읽는다', () => {
    expect(mapSeoulCulture(seoulRow)).toMatchObject({
      title: "2026 마포 '가을' 축제",
      startDate: '2026-10-10',
      endDate: '2026-10-12',
      region: '서울',
      district: '마포구',
      isFree: true,
      link: 'https://example.org/fest',
      source: 'seoul-culture',
    });
    expect(mapSeoulCulture({ ...seoulRow, CODENAME: '클래식' })).toBeNull();
  });

  it('관광공사 축제를 읽고 주소에서 시·군·구를 뽑는다', () => {
    expect(mapTourItem(tourItem, '경기')).toMatchObject({
      title: '수원화성문화제',
      startDate: '2026-10-09',
      endDate: '2026-10-11',
      region: '경기',
      district: '수원시',
      place: '경기도 수원시 팔달구 정조로 825 (남창동)',
    });
    expect(districtFromAddress('서울특별시 마포구 월드컵로 1')).toBe('마포구');
    expect(districtFromAddress('인천광역시 강화군 강화읍')).toBe('강화군');
    expect(districtFromAddress('')).toBeNull();
  });

  it('공공데이터포털 인코딩 키도 디코딩해서 쓴다', () => {
    expect(normalizeServiceKey(' abc%2Bdef%3D%3D ')).toBe('abc+def==');
    expect(normalizeServiceKey('abc+def==')).toBe('abc+def==');
  });

  it('끝난 축제는 빼고 같은 축제는 하나만, 시작일 순으로', () => {
    const base = mapSeoulCulture(seoulRow) as Festival;
    const dup = {
      ...base,
      id: 'tour-x',
      title: '2026 마포 가을 축제',
      source: 'tour-api' as const,
    };
    const past = { ...base, id: 'old', title: '지난 축제', endDate: '2026-09-01' };
    const early = { ...base, id: 'early', title: '이른 축제', startDate: '2026-10-02' };
    const merged = mergeFestivals(
      [
        [base, past],
        [dup, early],
      ],
      '2026-10-01'
    );
    expect(merged.map((f) => f.id)).toEqual(['early', base.id]);
  });

  it('키가 없거나 실패해도 나머지로 파일을 만든다', async () => {
    const get = jest.fn(async (url: string) => {
      if (url.includes('culturalEventInfo')) {
        return {
          culturalEventInfo: { list_total_count: 1, RESULT: { CODE: 'INFO-000' }, row: [seoulRow] },
        };
      }
      throw new Error('should not be called');
    });
    const result = await collectFestivals(
      { seoul: 'k' },
      new Date('2026-10-01T00:00:00+09:00'),
      get
    );
    expect(result.festivals).toHaveLength(1);
    expect(result.sources).toEqual([
      expect.objectContaining({ name: 'seoul-culture', ok: true, found: 1 }),
      expect.objectContaining({ name: 'tour-api', ok: false }),
    ]);
  });

  it('관광공사 응답을 지역마다 받아 합친다', async () => {
    const get = jest.fn(async (_url: string, params?: Record<string, string | number>) => ({
      response: {
        header: { resultCode: '0000', resultMsg: 'OK' },
        body: {
          totalCount: params?.areaCode === 31 ? 1 : 0,
          items: params?.areaCode === 31 ? { item: [tourItem] } : '',
        },
      },
    }));
    const result = await collectFestivals(
      { tour: 'k' },
      new Date('2026-10-01T00:00:00+09:00'),
      get
    );
    expect(get).toHaveBeenCalledTimes(3);
    expect(result.festivals.map((f) => f.title)).toEqual(['수원화성문화제']);
  });
});
