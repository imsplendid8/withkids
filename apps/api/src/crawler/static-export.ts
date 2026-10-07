import { Adapter, ExperienceData } from './adapter.interface';
import { detectSameDay, type SameDayBooking } from './same-day';

/**
 * 크롤 결과를 정적 웹(GitHub Pages)이 읽는 JSON 형태로 바꾼다.
 * 서버 없이 배포할 때 scripts/export-programs.ts가 사용한다.
 */

export interface StaticProgram {
  id: string;
  programName: string;
  institutionName: string;
  description: string | null;
  programUrl: string | null;
  bookingUrl: string | null;
  /** 체험일 (YYYY-MM-DD, 한국 날짜) */
  experienceDate: string | null;
  bookingOpenAt: string | null;
  bookingCloseAt: string | null;
  /** 무료 0, 금액을 모르면 null */
  price: number | null;
  ageGroup: string | null;
  /** 참여 대상 원문. 웹에서 아이별 참여 가능 여부를 판단한다 */
  targetInfo: string | null;
  /** 이용 기간 (YYYY-MM-DD, 한국 날짜) */
  serviceStartDate: string | null;
  serviceEndDate: string | null;
  category: string | null;
  area: string | null;
  paymentInfo: string | null;
  imageUrl: string | null;
  contact: string | null;
  statusLabel: string | null;
  /** 당일 예약(online)·현장 접수(onsite)·당일 불가(no). 상세 안내 문구로 판단, 모르면 null */
  sameDay: SameDayBooking | null;
  sameDayNote: string | null;
  targetAgeMin: number | null;
  targetAgeMax: number | null;
  bookingMethod: ExperienceData['bookingMethod'];
  status: ExperienceData['status'];
  source: string;
}

export interface SourceResult {
  adapterName: string;
  ok: boolean;
  programsFound: number;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string;
}

export interface ProgramsFile {
  generatedAt: string;
  sources: SourceResult[];
  programs: StaticProgram[];
}

/** 날짜를 한국 달력 날짜로. 실행 환경 시간대와 무관하게 같은 결과를 낸다. */
export function toSeoulYmd(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function parseAges(ageGroup?: string): { min: number | null; max: number | null } {
  const numbers = ageGroup?.match(/\d+/g)?.map(Number) ?? [];
  return { min: numbers[0] ?? null, max: numbers[1] ?? null };
}

function sameDayFields(description?: string) {
  const { status, note } = detectSameDay(description);
  return { sameDay: status, sameDayNote: note };
}

export function toStaticProgram(program: ExperienceData): StaticProgram {
  const ages = parseAges(program.ageGroup);
  const valid = (date?: Date | null) => (date && !Number.isNaN(date.getTime()) ? date : null);
  const experienceDate = valid(program.experienceDate);

  return {
    // URL 경로에 쓰이므로 안전한 문자만 남긴다
    id: `${program.externalSource}-${program.externalId}`.replace(/[^A-Za-z0-9_-]/g, '_'),
    programName: program.programName,
    institutionName: program.institutionName,
    description: program.description ?? null,
    programUrl: program.programUrl ?? null,
    bookingUrl: program.bookingUrl ?? null,
    experienceDate: experienceDate ? toSeoulYmd(experienceDate) : null,
    bookingOpenAt: valid(program.bookingOpenAt)?.toISOString() ?? null,
    bookingCloseAt: valid(program.bookingCloseAt)?.toISOString() ?? null,
    price: program.price ?? null,
    ageGroup: program.ageGroup ?? null,
    targetInfo: program.targetInfo ?? null,
    serviceStartDate: experienceDate ? toSeoulYmd(experienceDate) : null,
    serviceEndDate: valid(program.serviceEndAt) ? toSeoulYmd(program.serviceEndAt as Date) : null,
    category: program.category ?? null,
    area: program.area ?? null,
    paymentInfo: program.paymentInfo ?? null,
    imageUrl: program.imageUrl ?? null,
    contact: program.contact ?? null,
    statusLabel: program.statusLabel ?? null,
    ...sameDayFields(program.description),
    targetAgeMin: ages.min,
    targetAgeMax: ages.max,
    bookingMethod: program.bookingMethod,
    status: program.status,
    source: program.externalSource,
  };
}

/** 접수가 이미 끝난 프로그램은 둘러볼 이유가 없으니 정적 목록에서 뺀다 (이미 한 예약은 브라우저에 사본이 있다). */
export function isStillBookable(program: StaticProgram, now: Date): boolean {
  if (program.bookingCloseAt) return new Date(program.bookingCloseAt) >= now;
  return program.status !== 'CLOSED';
}

export async function collectPrograms(
  adapters: Adapter[],
  now: Date = new Date()
): Promise<ProgramsFile> {
  const sources: SourceResult[] = [];
  const programs = new Map<string, StaticProgram>();

  for (const adapter of adapters) {
    if (!adapter.metadata.enabled) continue;
    const startedAt = new Date().toISOString();
    try {
      const found = await adapter.fetchPrograms();
      for (const program of found) {
        const item = toStaticProgram(program);
        if (isStillBookable(item, now)) programs.set(item.id, item);
      }
      sources.push({
        adapterName: adapter.metadata.name,
        ok: true,
        programsFound: found.length,
        errorMessage: null,
        startedAt,
        completedAt: new Date().toISOString(),
      });
    } catch (error) {
      sources.push({
        adapterName: adapter.metadata.name,
        ok: false,
        programsFound: 0,
        errorMessage: error instanceof Error ? error.message : String(error),
        startedAt,
        completedAt: new Date().toISOString(),
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    sources,
    programs: [...programs.values()],
  };
}
