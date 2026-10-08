import axios from 'axios';
import { decodeHtml } from '../crawler/adapters/seoul-public-service.adapter';
import { toSeoulYmd } from '../crawler/static-export';

/**
 * 서울·근교(경기·인천) 축제 일정을 모아 정적 웹이 읽는 festivals.json으로 만든다.
 *
 * - 서울: 서울 열린데이터광장 "문화행사 정보"(culturalEventInfo) 중 분류가 '축제'인 것.
 *   공공서비스예약과 같은 SEOUL_OPENAPI_KEY를 쓴다.
 * - 서울·경기·인천: 한국관광공사 국문 관광정보 서비스(TourAPI) searchFestival2.
 *   공공데이터포털(data.go.kr) 인증키 TOUR_API_KEY가 필요하다.
 */

export type FestivalRegion = '서울' | '경기' | '인천';

export interface Festival {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  startDate: string;
  endDate: string;
  region: FestivalRegion;
  /** 구·시·군 (예: 마포구, 수원시) */
  district: string | null;
  place: string | null;
  imageUrl: string | null;
  /** 무료면 true, 유료면 false, 모르면 null */
  isFree: boolean | null;
  fee: string | null;
  target: string | null;
  category: string | null;
  link: string | null;
  source: 'seoul-culture' | 'tour-api';
}

export interface FestivalSourceResult {
  name: string;
  ok: boolean;
  found: number;
  errorMessage: string | null;
}

export interface FestivalsFile {
  generatedAt: string;
  sources: FestivalSourceResult[];
  festivals: Festival[];
}

type HttpGet = (url: string, params?: Record<string, string | number>) => Promise<unknown>;

const defaultGet: HttpGet = async (url, params) =>
  (await axios.get(url, { params, timeout: 120000, headers: { 'User-Agent': 'WITHKIDS/1.0' } }))
    .data;

const ymd = (value: string | undefined | null): string | null => {
  if (!value) return null;
  const digits = value.replace(/[^0-9]/g, '');
  if (digits.length < 8) return null;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
};

const clean = (value?: string | null) => decodeHtml(value ?? '') || null;

// ── 서울 문화행사 정보 ────────────────────────────────────────

interface SeoulCultureRow {
  CODENAME?: string;
  GUNAME?: string;
  TITLE?: string;
  DATE?: string;
  PLACE?: string;
  ORG_NAME?: string;
  USE_TRGT?: string;
  USE_FEE?: string;
  ORG_LINK?: string;
  HMPG_ADDR?: string;
  MAIN_IMG?: string;
  STRTDATE?: string;
  END_DATE?: string;
  IS_FREE?: string;
}

export function mapSeoulCulture(row: SeoulCultureRow): Festival | null {
  if (!row.TITLE || !/^축제/.test(row.CODENAME ?? '')) return null;
  const [dateStart, dateEnd] = (row.DATE ?? '').split('~');
  const startDate = ymd(row.STRTDATE) ?? ymd(dateStart);
  const endDate = ymd(row.END_DATE) ?? ymd(dateEnd) ?? startDate;
  if (!startDate || !endDate) return null;

  const title = clean(row.TITLE) as string;
  return {
    id: `seoul-${startDate}-${title}`.replace(/[^\p{L}\p{N}_-]/gu, '_'),
    title,
    startDate,
    endDate,
    region: '서울',
    district: clean(row.GUNAME),
    place: clean(row.PLACE),
    imageUrl: row.MAIN_IMG?.trim() || null,
    isFree: row.IS_FREE === '무료' ? true : row.IS_FREE === '유료' ? false : null,
    fee: clean(row.USE_FEE),
    target: clean(row.USE_TRGT),
    category: clean(row.CODENAME),
    link: row.ORG_LINK?.trim() || row.HMPG_ADDR?.trim() || null,
    source: 'seoul-culture',
  };
}

// 문화행사는 설명이 길어 1000건씩이면 응답이 느리다
const SEOUL_PAGE = 300;

/** 느린 공공 API를 위해 한 번 더 시도한다 */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (axios.isAxiosError(error) && !error.response) return fn();
    throw error;
  }
}

export async function fetchSeoulFestivals(
  apiKey: string,
  get: HttpGet = defaultGet
): Promise<Festival[]> {
  const base = process.env.SEOUL_OPENAPI_BASE_URL || 'http://openapi.seoul.go.kr:8088';
  const festivals: Festival[] = [];
  for (let start = 1; ; start += SEOUL_PAGE) {
    const end = start + SEOUL_PAGE - 1;
    const data = (await withRetry(() =>
      get(`${base}/${apiKey}/json/culturalEventInfo/${start}/${end}/`)
    )) as {
      culturalEventInfo?: {
        list_total_count?: number;
        RESULT?: { CODE?: string; MESSAGE?: string };
        row?: SeoulCultureRow[];
      };
      RESULT?: { CODE?: string; MESSAGE?: string };
    };
    const body = data?.culturalEventInfo;
    if (!body) {
      throw new Error(
        `서울시 문화행사 응답 오류: ${data?.RESULT?.CODE ?? '?'} ${data?.RESULT?.MESSAGE ?? ''}`.trim()
      );
    }
    if (body.RESULT?.CODE && !body.RESULT.CODE.startsWith('INFO-000')) {
      throw new Error(`${body.RESULT.CODE} ${body.RESULT.MESSAGE ?? ''}`.trim());
    }
    const rows = body.row ?? [];
    festivals.push(...rows.map(mapSeoulCulture).filter((f): f is Festival => f !== null));
    if (rows.length < SEOUL_PAGE || end >= (body.list_total_count ?? 0)) break;
  }
  return festivals;
}

// ── 한국관광공사 TourAPI ────────────────────────────────────

/**
 * 지역은 주소로 고른다. searchFestival2에 areaCode를 넣으면 결과가 0건으로 오는 경우가 있어
 * 전국을 받아 서울·인천·경기만 남긴다.
 */
export function tourRegion(item: { addr1?: string; areacode?: string }): FestivalRegion | null {
  const addr = (item.addr1 ?? '').trim();
  if (/^서울/.test(addr) || item.areacode === '1') return '서울';
  if (/^인천/.test(addr) || item.areacode === '2') return '인천';
  if (/^경기/.test(addr) || item.areacode === '31') return '경기';
  return null;
}

interface TourItem {
  contentid?: string;
  title?: string;
  addr1?: string;
  addr2?: string;
  eventstartdate?: string;
  eventenddate?: string;
  firstimage?: string;
  areacode?: string;
}

/** "경기도 수원시 팔달구 ..." → 수원시, "서울특별시 마포구 ..." → 마포구, "인천광역시 강화군 ..." → 강화군 */
export function districtFromAddress(address?: string | null): string | null {
  const parts = (address ?? '').trim().split(/\s+/);
  const found = parts.slice(1, 3).find((p) => /[시군구]$/.test(p));
  return found ?? null;
}

export function mapTourItem(item: TourItem, region: FestivalRegion): Festival | null {
  const startDate = ymd(item.eventstartdate);
  const endDate = ymd(item.eventenddate) ?? startDate;
  if (!item.title || !startDate || !endDate) return null;
  const title = clean(item.title) as string;
  return {
    id: `tour-${item.contentid ?? title}`.replace(/[^\p{L}\p{N}_-]/gu, '_'),
    title,
    startDate,
    endDate,
    region,
    district: districtFromAddress(item.addr1),
    place: [clean(item.addr1), clean(item.addr2)].filter(Boolean).join(' ') || null,
    imageUrl: item.firstimage?.trim() || null,
    isFree: null,
    fee: null,
    target: null,
    category: '축제',
    // 관광공사 상세 페이지 주소는 contentid만으로 만들 수 없어 검색으로 연결한다
    link: `https://search.naver.com/search.naver?query=${encodeURIComponent(title)}`,
    source: 'tour-api',
  };
}

/** 공공데이터포털 키는 "인코딩"·"디코딩" 두 가지를 준다. 어느 것을 넣어도 되게 디코딩해 쓴다 */
export function normalizeServiceKey(key: string): string {
  const trimmed = key.trim();
  try {
    return trimmed.includes('%') ? decodeURIComponent(trimmed) : trimmed;
  } catch {
    return trimmed;
  }
}

export async function fetchTourFestivals(
  apiKey: string,
  from: Date,
  get: HttpGet = defaultGet
): Promise<Festival[]> {
  const serviceKey = normalizeServiceKey(apiKey);
  const festivals: Festival[] = [];
  for (let pageNo = 1; pageNo <= 20; pageNo++) {
    const data = (await get('https://apis.data.go.kr/B551011/KorService2/searchFestival2', {
      serviceKey,
      MobileOS: 'ETC',
      MobileApp: 'WITHKIDS',
      _type: 'json',
      numOfRows: 500,
      pageNo,
      arrange: 'A',
      eventStartDate: toSeoulYmd(from).replace(/-/g, ''),
    })) as {
      response?: {
        header?: { resultCode?: string; resultMsg?: string };
        body?: { totalCount?: number; items?: { item?: TourItem[] | TourItem } | '' };
      };
    };
    const header = data?.response?.header;
    if (!data?.response || (header?.resultCode && header.resultCode !== '0000')) {
      const raw =
        typeof data === 'string'
          ? (data as string).slice(0, 200)
          : JSON.stringify(data).slice(0, 200);
      throw new Error(
        `관광공사 응답 오류: ${header?.resultCode ?? ''} ${header?.resultMsg ?? raw}`.trim()
      );
    }
    const body = data.response.body;
    const raw = body?.items && typeof body.items === 'object' ? body.items.item : [];
    const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
    for (const item of items) {
      const region = tourRegion(item);
      const festival = region ? mapTourItem(item, region) : null;
      if (festival) festivals.push(festival);
    }
    if (items.length < 500 || pageNo * 500 >= (body?.totalCount ?? 0)) break;
  }
  return festivals;
}

// ── 모으기 ─────────────────────────────────────────────────

const titleKey = (title: string) => title.replace(/[\s\p{P}\p{S}]/gu, '').replace(/^\d{4}/, '');

/**
 * 끝난 축제는 빼고, 두 곳에 같은 축제가 있으면 하나만 남긴다
 * (서울 문화행사 쪽이 요금·대상 정보가 있어 우선).
 */
export function mergeFestivals(lists: Festival[][], today: string): Festival[] {
  const byKey = new Map<string, Festival>();
  for (const list of lists) {
    for (const festival of list) {
      if (festival.endDate < today) continue;
      const key = `${festival.region}|${titleKey(festival.title)}|${festival.startDate}`;
      if (!byKey.has(key)) byKey.set(key, festival);
    }
  }
  return [...byKey.values()].sort(
    (a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title, 'ko')
  );
}

export async function collectFestivals(
  keys: { seoul?: string; tour?: string },
  now: Date = new Date(),
  get: HttpGet = defaultGet
): Promise<FestivalsFile> {
  const sources: FestivalSourceResult[] = [];
  const lists: Festival[][] = [];

  const run = async (
    name: string,
    key: string | undefined,
    missing: string,
    fetcher: () => Promise<Festival[]>
  ) => {
    if (!key?.trim()) {
      sources.push({ name, ok: false, found: 0, errorMessage: missing });
      return;
    }
    try {
      const found = await fetcher();
      lists.push(found);
      sources.push({ name, ok: true, found: found.length, errorMessage: null });
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response
          ? `HTTP ${error.response.status} ${JSON.stringify(error.response.data).slice(0, 150)}`
          : `서버에 연결하지 못했습니다 (${error.message})`
        : error instanceof Error
          ? error.message
          : String(error);
      sources.push({ name, ok: false, found: 0, errorMessage: message });
    }
  };

  await run('seoul-culture', keys.seoul, '서울시 인증키(SEOUL_OPENAPI_KEY)가 없습니다.', () =>
    fetchSeoulFestivals(keys.seoul as string, get)
  );
  // 이미 시작해 진행 중인 축제도 받도록 두 달 전부터 묻는다
  const from = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  await run(
    'tour-api',
    keys.tour,
    '관광공사 인증키(TOUR_API_KEY)가 없어 경기·인천 축제는 아직 못 가져옵니다.',
    () => fetchTourFestivals(keys.tour as string, from, get)
  );

  return {
    generatedAt: now.toISOString(),
    sources,
    festivals: mergeFestivals(lists, toSeoulYmd(now)),
  };
}
