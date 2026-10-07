import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ExperienceData, CrawlSchedule } from '../adapter.interface';
import { BaseAdapter } from './base.adapter';

/**
 * 서울 열린데이터광장 "공공서비스예약" 오픈 API 어댑터.
 *
 * 인증키 발급: https://data.seoul.go.kr → 로그인 → 인증키 신청 (즉시 발급, 무료)
 * 발급받은 키를 SEOUL_OPENAPI_KEY 환경변수에 넣으면 동작한다.
 *
 * 요청 형식: /{KEY}/json/{SERVICE}/{START}/{END}/
 * 서비스: ListPublicReservationEducation(교육체험), ListPublicReservationCulture(문화행사)
 */
export const SEOUL_SERVICES = [
  'ListPublicReservationEducation',
  'ListPublicReservationCulture',
] as const;

const SERVICE_LABELS: Record<(typeof SEOUL_SERVICES)[number], string> = {
  ListPublicReservationEducation: '교육체험',
  ListPublicReservationCulture: '문화행사',
};

export const SEOUL_BASE_URL = 'http://openapi.seoul.go.kr:8088';

/** 한 번의 요청으로 받을 수 있는 최대 건수 (서울 오픈API 제한) */
const PAGE_SIZE = 1000;

/**
 * mapRow가 실제로 읽는 응답 필드. 검증 스크립트가 실제 응답과 대조할 때 쓴다.
 * 매핑을 바꾸면 이 목록도 함께 고쳐야 한다.
 */
export const SEOUL_ROW_FIELDS = [
  'SVCID',
  'SVCNM',
  'DTLCONT',
  'PLACENM',
  'SVCURL',
  'SVCSTATNM',
  'PAYATNM',
  'USETGTINFO',
  'RCPTBGNDT',
  'RCPTENDDT',
  'SVCOPNBGNDT',
  'SVCOPNENDDT',
  'AREANM',
  'MAXCLASSNM',
  'MINCLASSNM',
  'IMGURL',
  'TELNO',
] as const;

/** 이 필드가 없으면 행 자체를 매핑할 수 없다 */
export const SEOUL_REQUIRED_FIELDS = ['SVCID', 'SVCNM'] as const;

interface SeoulReservationRow {
  SVCID?: string;
  SVCNM?: string;
  DTLCONT?: string;
  PLACENM?: string;
  SVCURL?: string;
  SVCSTATNM?: string;
  PAYATNM?: string;
  USETGTINFO?: string;
  RCPTBGNDT?: string;
  RCPTENDDT?: string;
  SVCOPNBGNDT?: string;
  SVCOPNENDDT?: string;
  AREANM?: string;
  MAXCLASSNM?: string;
  MINCLASSNM?: string;
  IMGURL?: string;
  TELNO?: string;
}

interface SeoulServiceBody {
  list_total_count?: number;
  RESULT?: { CODE?: string; MESSAGE?: string };
  row?: SeoulReservationRow[];
}

@Injectable()
export class SeoulPublicServiceAdapter extends BaseAdapter {
  private readonly logger = new Logger(SeoulPublicServiceAdapter.name);

  constructor() {
    super(
      'seoul-public-service',
      process.env.SEOUL_OPENAPI_BASE_URL || SEOUL_BASE_URL,
      CrawlSchedule.DAILY
    );

    this.metadata.automationInfo = {
      isAutomatable: true,
      blockers: [],
      notes:
        '서울 열린데이터광장 공공서비스예약 API. SEOUL_OPENAPI_KEY 필요 (data.seoul.go.kr에서 즉시 무료 발급).',
    };
  }

  async fetchPrograms(): Promise<ExperienceData[]> {
    const apiKey = process.env.SEOUL_OPENAPI_KEY?.trim();
    if (!apiKey) {
      // 앱 화면의 "마지막 수집 결과"에 그대로 보인다.
      throw new Error(
        '서울시 인증키(SEOUL_OPENAPI_KEY)가 .env에 없습니다. data.seoul.go.kr에서 발급받아 넣어주세요.'
      );
    }

    const programs: ExperienceData[] = [];
    const errors: string[] = [];

    for (const service of SEOUL_SERVICES) {
      try {
        programs.push(...(await this.fetchService(apiKey, service)));
      } catch (error) {
        const message = this.describeError(error);
        errors.push(`${SERVICE_LABELS[service]}: ${message}`);
        this.logger.error(`${service} 조회 실패: ${message}`);
      }
    }

    // 전부 실패했을 때만 실패로 본다. 하나라도 받았으면 받은 것은 저장한다.
    if (errors.length === SEOUL_SERVICES.length) {
      throw new Error(errors.join(' / '));
    }

    return programs;
  }

  private describeError(error: unknown): string {
    if (axios.isAxiosError(error) && !error.response) {
      return `서울시 서버에 연결하지 못했습니다 (${error.message})`;
    }
    return error instanceof Error ? error.message : String(error);
  }

  private async fetchService(apiKey: string, service: string): Promise<ExperienceData[]> {
    const collected: ExperienceData[] = [];
    let start = 1;

    for (;;) {
      const end = start + PAGE_SIZE - 1;
      const response = await this.http.get(`/${apiKey}/json/${service}/${start}/${end}/`);
      const body: SeoulServiceBody | undefined = response.data?.[service];

      if (!body) {
        // 인증키 오류·호출한도 초과 등은 서비스 키 없이 RESULT만 돌려준다.
        const result = response.data?.RESULT;
        throw new Error(
          `예상과 다른 응답: ${result?.CODE ?? '?'} ${result?.MESSAGE ?? JSON.stringify(response.data).slice(0, 200)}`
        );
      }

      if (body.RESULT?.CODE && !body.RESULT.CODE.startsWith('INFO-000')) {
        throw new Error(`${body.RESULT.CODE} ${body.RESULT.MESSAGE ?? ''}`);
      }

      const rows = body.row ?? [];
      const mapped = rows
        .map((row) => this.mapRow(row, service))
        .filter((program): program is ExperienceData => program !== null);

      if (rows.length > 0 && mapped.length === 0) {
        // 필드명이 바뀌면 조용히 0건이 되므로 실제 필드를 남겨 원인을 바로 알 수 있게 한다.
        throw new Error(
          `${rows.length}건을 받았지만 응답 형식이 예상과 달라 읽지 못했습니다. 받은 필드: ${Object.keys(rows[0]).join(', ')}`
        );
      }

      collected.push(...mapped);

      const total = body.list_total_count ?? rows.length;
      if (rows.length < PAGE_SIZE || end >= total) break;
      start = end + 1;
    }

    this.logger.log(`${service}: ${collected.length}건 수집`);
    return collected;
  }

  private mapRow(row: SeoulReservationRow, service: string): ExperienceData | null {
    if (!row.SVCID || !row.SVCNM) return null;

    return {
      externalId: row.SVCID,
      institutionName: decodeHtml(row.PLACENM) || '서울시 공공서비스예약',
      programName: decodeHtml(row.SVCNM),
      description: stripCommonNotice(htmlToText(row.DTLCONT)) || undefined,
      programUrl: row.SVCURL || undefined,
      bookingUrl: row.SVCURL || undefined,
      experienceDate: this.parseSeoulDate(row.SVCOPNBGNDT),
      serviceEndAt: this.parseSeoulDate(row.SVCOPNENDDT),
      bookingOpenAt: this.parseSeoulDate(row.RCPTBGNDT),
      bookingCloseAt: this.parseSeoulDate(row.RCPTENDDT),
      price: row.PAYATNM?.includes('무료') ? 0 : undefined,
      ageGroup: this.getAgeGroup(row.USETGTINFO ?? '') || undefined,
      targetInfo: decodeHtml(row.USETGTINFO) || undefined,
      category:
        [row.MAXCLASSNM, row.MINCLASSNM].map(decodeHtml).filter(Boolean).join(' > ') || undefined,
      area:
        inferDistrict(decodeHtml(row.AREANM), decodeHtml(row.PLACENM), decodeHtml(row.SVCNM)) ||
        undefined,
      paymentInfo: decodeHtml(row.PAYATNM) || undefined,
      imageUrl: row.IMGURL?.trim() || undefined,
      contact: decodeHtml(row.TELNO) || undefined,
      statusLabel: decodeHtml(row.SVCSTATNM) || undefined,
      bookingMethod: 'FIRST_COME',
      status: this.mapStatus(row.SVCSTATNM),
      externalSource: service,
    };
  }

  /** "2026-09-21 09:00:00.0" 형태를 Date로 변환 */
  private parseSeoulDate(value?: string): Date | null {
    if (!value) return null;
    return this.parseDate(value.replace(/\.0$/, '').replace(' ', 'T'));
  }

  private mapStatus(statusName?: string): 'OPENING_SOON' | 'OPEN' | 'CLOSED' | 'UNKNOWN' {
    switch (statusName) {
      case '접수중':
        return 'OPEN';
      case '안내중':
        return 'OPENING_SOON';
      case '예약마감':
      case '접수종료':
      case '기간만료':
        return 'CLOSED';
      default:
        return 'UNKNOWN';
    }
  }
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  middot: '·',
};

/** 서울시 API는 "&middot;", "&#39;" 처럼 HTML 엔티티가 섞인 글자를 돌려준다. */
export function decodeHtml(value?: string): string {
  if (!value) return '';
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (match, name) => NAMED_ENTITIES[name.toLowerCase()] ?? match)
    .trim();
}

/** 상세 설명(DTLCONT)은 HTML이다. 줄바꿈만 살리고 태그를 걷어낸 글로 바꾼다 */
export function htmlToText(value?: string): string {
  if (!value) return '';
  const text = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  return decodeHtml(text)
    .split('\n')
    .map((line) => line.replace(/[ \t\u00a0]+/g, ' ').trim())
    .filter((line, i, lines) => line || (i > 0 && lines[i - 1]))
    .join('\n')
    .trim();
}

/**
 * 서울시 상세 설명은 모든 프로그램에 같은 공통 안내("1. 공공시설 예약서비스 이용시 필수 준수사항",
 * "2. 시설예약")로 시작하고 "3. 상세내용"부터 실제 내용이 나온다. 공통 안내는 걷어낸다.
 */
export function stripCommonNotice(text: string): string {
  if (!/^1\.\s*공공시설 예약서비스/.test(text)) return text;
  const match = text.match(/(?:^|\s)3\.\s*상세\s*내용\s*/);
  if (!match || match.index === undefined) return text;
  return text.slice(match.index + match[0].length).trim();
}

export const SEOUL_DISTRICTS = [
  '종로구',
  '중구',
  '용산구',
  '성동구',
  '광진구',
  '동대문구',
  '중랑구',
  '성북구',
  '강북구',
  '도봉구',
  '노원구',
  '은평구',
  '서대문구',
  '마포구',
  '양천구',
  '강서구',
  '구로구',
  '금천구',
  '영등포구',
  '동작구',
  '관악구',
  '서초구',
  '강남구',
  '송파구',
  '강동구',
] as const;

/** 구 이름 없이 장소 이름만 있는 곳 */
const LANDMARK_DISTRICTS: Array<[RegExp, string]> = [
  [/남산|중부공원|석호정|호현당|대한문|정동|서울갤러리|서울도서관/, '중구'],
  [/매헌시민의숲|양재시민의숲/, '서초구'],
  [/한성대입구/, '성북구'],
  // 서울시가 운영하지만 서울 밖에서 하는 체험 (주말농장 등)
  [/가평|강화|연천|안성|영월|양평|포천|파주|김포|남양주|홍천|춘천/, '서울 외'],
];

/**
 * 지역(자치구). 서울시가 비워 둔 경우 장소·프로그램 이름에서 찾는다.
 * "(중랑구)봉수대공원", "성동가드닝센터"처럼 이름에 구가 들어 있는 경우가 많다.
 */
export function inferDistrict(area: string, place: string, name: string): string {
  if (area) return area;
  const text = `${place} ${name}`;
  const full = SEOUL_DISTRICTS.find((d) => text.includes(d));
  if (full) return full;
  // "성동가드닝센터" → 성동구 (한 글자인 '중'은 흔한 글자라 제외)
  const short = SEOUL_DISTRICTS.find((d) => d.length > 2 && text.includes(d.slice(0, -1)));
  if (short) return short;
  return LANDMARK_DISTRICTS.find(([re]) => re.test(text))?.[1] ?? '';
}
