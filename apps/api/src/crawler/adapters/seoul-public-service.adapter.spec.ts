import {
  decodeHtml,
  htmlToText,
  inferDistrict,
  SeoulPublicServiceAdapter,
  stripCommonNotice,
} from './seoul-public-service.adapter';

/**
 * 서울 열린데이터광장 공공서비스예약 API 응답 형태를 고정해 두고 매핑을 검증한다.
 * 실제 호출 없이 필드 매핑이 깨지는 것을 잡는 용도.
 */
const educationRow = {
  GUBUN: '교육체험',
  SVCID: 'S240101000000001',
  MAXCLASSNM: '교육체험',
  MINCLASSNM: '문화교양',
  SVCSTATNM: '접수중',
  SVCNM: '어린이 목공 교실',
  PAYATNM: '유료',
  PLACENM: '서울시립과학관',
  USETGTINFO: '초등 3-6학년',
  SVCURL:
    'https://yeyak.seoul.go.kr/web/reservation/selectReservView.do?rsv_svc_id=S240101000000001',
  RCPTBGNDT: '2026-09-01 10:00:00.0',
  RCPTENDDT: '2026-09-20 18:00:00.0',
  SVCOPNBGNDT: '2026-09-26 00:00:00.0',
  SVCOPNENDDT: '2026-09-26 00:00:00.0',
  AREANM: '노원구',
  DTLCONT: '목공 도구로 나만의 소품을 만드는 체험입니다.',
};

const freeCultureRow = {
  SVCID: 'S240101000000002',
  SVCNM: '가족 천체 관측회',
  SVCSTATNM: '안내중',
  PAYATNM: '무료',
  PLACENM: '서울시립천문대',
  SVCURL: 'https://yeyak.seoul.go.kr/web/reservation/x',
  SVCOPNBGNDT: '2026-10-05 00:00:00.0',
};

const buildAdapter = (payload: unknown) => {
  const adapter = new SeoulPublicServiceAdapter();
  const get = jest.fn().mockResolvedValue({ data: payload });
  // BaseAdapter가 만든 axios 인스턴스를 테스트용으로 대체한다.
  (adapter as unknown as { http: { get: jest.Mock } }).http = { get };
  return { adapter, get };
};

describe('SeoulPublicServiceAdapter', () => {
  const originalKey = process.env.SEOUL_OPENAPI_KEY;

  afterEach(() => {
    process.env.SEOUL_OPENAPI_KEY = originalKey;
    if (originalKey === undefined) delete process.env.SEOUL_OPENAPI_KEY;
  });

  it('인증키가 없으면 호출하지 않고 이유를 담아 실패한다', async () => {
    delete process.env.SEOUL_OPENAPI_KEY;
    const { adapter, get } = buildAdapter({});

    await expect(adapter.fetchPrograms()).rejects.toThrow('SEOUL_OPENAPI_KEY');
    expect(get).not.toHaveBeenCalled();
  });

  it('교육체험 응답을 ExperienceData로 매핑한다', async () => {
    process.env.SEOUL_OPENAPI_KEY = 'test-key';
    const { adapter, get } = buildAdapter({
      ListPublicReservationEducation: {
        list_total_count: 1,
        RESULT: { CODE: 'INFO-000', MESSAGE: '정상 처리되었습니다' },
        row: [educationRow],
      },
    });

    const programs = await adapter.fetchPrograms();
    const program = programs.find((p) => p.externalId === 'S240101000000001');

    expect(get).toHaveBeenCalledWith('/test-key/json/ListPublicReservationEducation/1/1000/');
    expect(program).toMatchObject({
      institutionName: '서울시립과학관',
      programName: '어린이 목공 교실',
      description: '목공 도구로 나만의 소품을 만드는 체험입니다.',
      programUrl: educationRow.SVCURL,
      status: 'OPEN',
      ageGroup: '3-6',
      bookingMethod: 'FIRST_COME',
      externalSource: 'ListPublicReservationEducation',
      category: '교육체험 > 문화교양',
      area: '노원구',
      paymentInfo: '유료',
      statusLabel: '접수중',
    });
    expect(program!.experienceDate).toEqual(new Date('2026-09-26T00:00:00'));
    expect(program!.serviceEndAt).toEqual(new Date('2026-09-26T00:00:00'));
    expect(program!.bookingOpenAt).toEqual(new Date('2026-09-01T10:00:00'));
    expect(program!.bookingCloseAt).toEqual(new Date('2026-09-20T18:00:00'));
  });

  it('무료 프로그램은 가격 0으로, 안내중은 OPENING_SOON으로 매핑한다', async () => {
    process.env.SEOUL_OPENAPI_KEY = 'test-key';
    const { adapter } = buildAdapter({
      ListPublicReservationCulture: {
        list_total_count: 1,
        RESULT: { CODE: 'INFO-000' },
        row: [freeCultureRow],
      },
    });

    const programs = await adapter.fetchPrograms();
    const program = programs.find((p) => p.externalId === 'S240101000000002');

    expect(program).toMatchObject({ price: 0, status: 'OPENING_SOON' });
  });

  it('SVCID나 SVCNM이 없는 행은 건너뛴다', async () => {
    process.env.SEOUL_OPENAPI_KEY = 'test-key';
    const { adapter } = buildAdapter({
      ListPublicReservationEducation: {
        list_total_count: 2,
        RESULT: { CODE: 'INFO-000' },
        row: [{ SVCNM: '이름만 있음' }, educationRow],
      },
    });

    const programs = await adapter.fetchPrograms();

    expect(programs).toHaveLength(1);
    expect(programs[0].externalId).toBe('S240101000000001');
  });

  it('모든 서비스가 실패하면 서비스별 원인을 담아 실패한다', async () => {
    process.env.SEOUL_OPENAPI_KEY = 'bad-key';
    const { adapter } = buildAdapter({
      RESULT: { CODE: 'INFO-100', MESSAGE: '인증키가 유효하지 않습니다.' },
    });

    const error = await adapter.fetchPrograms().catch((e: Error) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('교육체험: ');
    expect((error as Error).message).toContain('문화행사: ');
    expect((error as Error).message).toContain('인증키가 유효하지 않습니다');
  });

  it('한 서비스만 실패하면 받은 것은 돌려준다', async () => {
    process.env.SEOUL_OPENAPI_KEY = 'test-key';
    const { adapter, get } = buildAdapter({});
    get.mockImplementation(async (url: string) =>
      url.includes('ListPublicReservationEducation')
        ? {
            data: {
              ListPublicReservationEducation: {
                list_total_count: 1,
                RESULT: { CODE: 'INFO-000' },
                row: [educationRow],
              },
            },
          }
        : { data: { RESULT: { CODE: 'ERROR-500', MESSAGE: '서버 오류' } } }
    );

    const programs = await adapter.fetchPrograms();
    expect(programs.map((p) => p.externalId)).toEqual(['S240101000000001']);
  });

  it('행은 받았는데 형식이 달라 하나도 못 읽으면 받은 필드를 알려준다', async () => {
    process.env.SEOUL_OPENAPI_KEY = 'test-key';
    const { adapter, get } = buildAdapter({});
    get.mockImplementation(async (url: string) => {
      const service = url.split('/')[3];
      return {
        data: {
          [service]: {
            list_total_count: 1,
            RESULT: { CODE: 'INFO-000' },
            row: [{ SERVICE_ID: 'x', SERVICE_NAME: 'y' }],
          },
        },
      };
    });

    await expect(adapter.fetchPrograms()).rejects.toThrow('받은 필드: SERVICE_ID, SERVICE_NAME');
  });
});

describe('decodeHtml', () => {
  it('서울시 응답의 HTML 엔티티를 글자로 바꾼다', () => {
    expect(decodeHtml(' 2026년 상&middot;하반기 &#39;내 친구 박물관&#39; &amp; &#x41; ')).toBe(
      "2026년 상·하반기 '내 친구 박물관' & A"
    );
    expect(decodeHtml('&unknown; 그대로')).toBe('&unknown; 그대로');
    expect(decodeHtml(undefined)).toBe('');
  });
});

describe('htmlToText', () => {
  it('상세 설명 HTML을 줄바꿈 있는 글로 바꾼다', () => {
    expect(
      htmlToText(
        '<p>1. 이용 안내</p><p>&nbsp;</p><p>준비물: 물&middot;모자<br/>우천 시 취소</p><div><strong>문의</strong> 02-000</div>'
      )
    ).toBe('1. 이용 안내\n\n준비물: 물·모자\n우천 시 취소\n문의 02-000');
    expect(htmlToText(undefined)).toBe('');
  });
});

describe('stripCommonNotice', () => {
  it('서울시 공통 안내를 걷어내고 상세내용부터 남긴다', () => {
    const text =
      '1. 공공시설 예약서비스 이용시 필수 준수사항\n모든 서비스의 이용은...\n2. 시설예약\n비회원일 경우...\n3. 상세내용\n[가을로 풍덩] 가을풀꽃놀이\n활동일 10월 18일\n4. 주의사항\n- 취소는 2일 전까지';
    expect(stripCommonNotice(text)).toBe(
      '[가을로 풍덩] 가을풀꽃놀이\n활동일 10월 18일\n4. 주의사항\n- 취소는 2일 전까지'
    );
  });

  it('상세내용이 같은 줄에 이어져도 걷어낸다', () => {
    expect(
      stripCommonNotice(
        '1. 공공시설 예약서비스 이용시 필수 준수사항 모든 서비스의... 2. 시설예약 비회원일 경우... 3. 상세내용 2026년 목편만들기\n■ 운영시간 : 14:00'
      )
    ).toBe('2026년 목편만들기\n■ 운영시간 : 14:00');
  });

  it('공통 안내가 없으면 그대로', () => {
    expect(stripCommonNotice('목공 체험입니다.')).toBe('목공 체험입니다.');
    expect(stripCommonNotice('1. 공공시설 예약서비스 안내\n상세내용 없음')).toBe(
      '1. 공공시설 예약서비스 안내\n상세내용 없음'
    );
  });
});

describe('inferDistrict', () => {
  it('서울시가 준 지역을 우선 쓴다', () => {
    expect(inferDistrict('송파구', '성동가드닝센터', '')).toBe('송파구');
  });

  it('비어 있으면 장소·이름에서 구를 찾는다', () => {
    expect(inferDistrict('', '봉수대공원', '(중랑구)봉수대공원-서울형정원처방')).toBe('중랑구');
    expect(inferDistrict('', '성동가드닝센터', '성동 가드닝 프로그램')).toBe('성동구');
    expect(inferDistrict('', '중구정원지원센터', '중구 반려식물 클리닉')).toBe('중구');
    expect(inferDistrict('', '중부공원여가센터>호현당', '(토)호현당 서당체험(가족)')).toBe('중구');
    expect(inferDistrict('', '서울둘레길 10코스(매헌시민의숲) 일대', '정원처방')).toBe('서초구');
  });

  it('서울 밖 체험은 "서울 외", 모르면 비워 둔다', () => {
    expect(inferDistrict('', '가평 아홉마지기마을', '[도시가족 주말농부]')).toBe('서울 외');
    expect(inferDistrict('', '회차별 상이', '문학 속 영화 투어')).toBe('');
  });
});
