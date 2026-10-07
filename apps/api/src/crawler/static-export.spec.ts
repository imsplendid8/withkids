import { Adapter, CrawlSchedule, ExperienceData } from './adapter.interface';
import { collectPrograms, toSeoulYmd, toStaticProgram } from './static-export';

const program = (overrides: Partial<ExperienceData> = {}): ExperienceData => ({
  externalId: 'S1/2',
  institutionName: '서울시립과학관',
  programName: '어린이 목공 교실',
  bookingMethod: 'FIRST_COME',
  status: 'OPEN',
  externalSource: 'ListPublicReservationEducation',
  ...overrides,
});

const adapter = (
  name: string,
  fetch: () => Promise<ExperienceData[]>,
  enabled = true
): Adapter => ({
  metadata: { name, enabled, schedule: CrawlSchedule.DAILY },
  fetchPrograms: fetch,
});

describe('static export', () => {
  it('한국 날짜로 변환한다 (UTC 기준 전날 밤도 다음 날로)', () => {
    expect(toSeoulYmd(new Date('2026-10-04T15:30:00Z'))).toBe('2026-10-05');
  });

  it('프로그램을 정적 JSON 형태로 바꾼다', () => {
    const result = toStaticProgram(
      program({
        experienceDate: new Date('2026-10-04T15:00:00Z'),
        bookingOpenAt: new Date('2026-10-01T01:00:00Z'),
        price: 0,
        ageGroup: '6-12',
      })
    );

    expect(result).toMatchObject({
      id: 'ListPublicReservationEducation-S1_2',
      experienceDate: '2026-10-05',
      bookingOpenAt: '2026-10-01T01:00:00.000Z',
      bookingCloseAt: null,
      price: 0,
      targetAgeMin: 6,
      targetAgeMax: 12,
      source: 'ListPublicReservationEducation',
    });
  });

  it('가격을 모르면 null, 잘못된 날짜는 비운다', () => {
    const result = toStaticProgram(program({ experienceDate: new Date('invalid') }));
    expect(result.price).toBeNull();
    expect(result.experienceDate).toBeNull();
  });

  it('수집원 하나가 실패해도 나머지를 모으고 실패 이유를 남긴다', async () => {
    const result = await collectPrograms([
      adapter('seoul-public-service', async () => {
        throw new Error('인증키가 유효하지 않습니다');
      }),
      adapter('data-loader', async () => [
        program({ externalId: 'a' }),
        program({ externalId: 'b' }),
      ]),
      adapter('museum', async () => [program({ externalId: 'x' })], false),
    ]);

    expect(result.programs.map((p) => p.id)).toEqual([
      'ListPublicReservationEducation-a',
      'ListPublicReservationEducation-b',
    ]);
    expect(result.sources).toEqual([
      expect.objectContaining({
        adapterName: 'seoul-public-service',
        ok: false,
        errorMessage: '인증키가 유효하지 않습니다',
      }),
      expect.objectContaining({ adapterName: 'data-loader', ok: true, programsFound: 2 }),
    ]);
  });

  it('같은 프로그램이 두 번 오면 하나로 합친다', async () => {
    const result = await collectPrograms([
      adapter('data-loader', async () => [program(), program({ programName: '갱신된 이름' })]),
    ]);
    expect(result.programs).toHaveLength(1);
    expect(result.programs[0].programName).toBe('갱신된 이름');
  });

  it('접수가 이미 끝난 프로그램은 뺀다', async () => {
    const now = new Date('2026-10-01T00:00:00Z');
    const result = await collectPrograms(
      [
        adapter('seoul-public-service', async () => [
          program({ externalId: 'past', bookingCloseAt: new Date('2026-09-30T09:00:00Z') }),
          program({ externalId: 'open', bookingCloseAt: new Date('2026-10-03T09:00:00Z') }),
          program({ externalId: 'closed', status: 'CLOSED' }),
          program({ externalId: 'unknown-close' }),
        ]),
      ],
      now
    );
    expect(result.programs.map((p) => p.id)).toEqual([
      'ListPublicReservationEducation-open',
      'ListPublicReservationEducation-unknown-close',
    ]);
  });
});
