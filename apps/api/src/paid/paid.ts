import axios from 'axios';
import { decodeHtml } from '../crawler/adapters/seoul-public-service.adapter';
import { normalizeServiceKey } from '../festivals/festivals';

/**
 * 유료 체험 모으기 (서울·경기·인천).
 *
 * - 놀이의발견(nolbal.com): 아이 체험·이용권 판매 사이트. robots.txt가 웹 페이지 수집을 허용하고,
 *   목록은 자바스크립트로만 그려져서 공식 사이트맵의 상품 페이지를 읽는다(페이지에 상품 정보가 JSON으로 들어 있다).
 *   상대 서버 부담을 줄이려고 한 번에 정해진 수만 천천히 받고, 지난번 결과(캐시)를 재사용해 며칠에 걸쳐 갱신한다.
 *   api.nolbal.com 은 robots.txt가 막고 있어 쓰지 않는다.
 * - 대한민국 구석구석(한국관광공사 TourAPI): 체험관광지·문화시설 목록. TOUR_API_KEY가 있을 때만.
 * - 마이리얼트립은 robots.txt가 수집을 막아 화면에서 검색 바로가기만 제공한다.
 */

export const PAID_REGIONS = ['서울', '경기', '인천'] as const;

export interface PaidItem {
  id: string;
  source: 'nolbal' | 'visitkorea';
  title: string;
  /** 서울/경기/인천 */
  sido: string;
  /** 구·시·군 (예: 강남, 부천) */
  gugun: string | null;
  place: string | null;
  address: string | null;
  imageUrl: string | null;
  url: string;
  /** 대표 가격. 모르면 null */
  price: {
    original: number | null;
    sale: number | null;
    percent: number | null;
    option: string | null;
  } | null;
  minAge: number | null;
  maxAge: number | null;
  rating: number | null;
  reviewCount: number | null;
  /** 구매 당일 사용 가능 */
  sameDay: boolean | null;
  /** 사용 기한 문구 (예: "~ 2026.10.31") */
  availableUntil: string | null;
  categories: string[];
}

export interface PaidCacheEntry {
  fetchedAt: string;
  /** 판매 중이 아니거나 읽을 수 없으면 null (다시 받기 전까지 건너뜀) */
  item: PaidItem | null;
}

export interface PaidCache {
  nolbal: Record<string, PaidCacheEntry>;
}

export interface PaidFile {
  generatedAt: string;
  sources: Array<{
    id: string;
    name: string;
    ok: boolean;
    found: number;
    errorMessage: string | null;
    note?: string;
  }>;
  items: PaidItem[];
}

type HttpGet = (url: string, params?: Record<string, string | number>) => Promise<unknown>;

const defaultGet: HttpGet = async (url, params) =>
  (
    await axios.get(url, {
      params,
      timeout: 60000,
      headers: { 'User-Agent': 'Mozilla/5.0 (WITHKIDS family planner; personal use)' },
    })
  ).data;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ── 놀이의발견 ─────────────────────────────────────────────

export const NOLBAL_SITEMAP = 'https://nolbal.com/sitemap-activity.xml';
const nolbalUrl = (id: string) => `https://nolbal.com/content/detail/${id}`;

export function parseSitemapIds(xml: string): string[] {
  const ids = [
    ...xml.matchAll(/<loc>\s*https?:\/\/(?:www\.)?nolbal\.com\/content\/detail\/(\d+)\s*<\/loc>/g),
  ].map((m) => m[1]);
  return [...new Set(ids)];
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? decodeHtml(v) : null;

/** 상품 페이지 Next.js 데이터 중 쓰는 부분 */
interface NolbalContent {
  content_name?: string;
  content_thumbnail?: string;
  content_available_date?: string;
  activate_state?: string;
  is_display?: boolean;
  for_shipping?: boolean;
  for_online?: boolean;
  short_address?: { sido?: string; gugun?: string };
  branch?: { branch_name?: string; branch_address?: string };
  price?: { original?: number; discount?: number; percent?: number; option_name?: string };
  review?: { star?: number; count?: number };
  content_recommended_min_age?: number;
  content_recommended_max_age?: number;
  information?: { raw_usable_the_day?: boolean };
  categories?: Array<Record<string, unknown>>;
}

/** 상품 페이지에 들어 있는 상품 정보(Next.js 데이터)를 읽는다. 판매 중이 아니면 null */
export function parseNolbalDetail(html: string, id: string): PaidItem | null {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return null;
  let data: {
    props?: { pageProps?: { initialState?: { contentDetail?: { data?: NolbalContent } } } };
  };
  try {
    data = JSON.parse(match[1]);
  } catch {
    return null;
  }
  const d = data?.props?.pageProps?.initialState?.contentDetail?.data;
  if (!d || !d.content_name) return null;
  if (d.activate_state && d.activate_state !== 'activated') return null;
  if (d.is_display === false || d.for_shipping || d.for_online) return null;

  const sido = str(d.short_address?.sido);
  if (!sido) return null;
  const price: NonNullable<NolbalContent['price']> = d.price ?? {};
  const review: NonNullable<NolbalContent['review']> = d.review ?? {};
  return {
    id: `nolbal-${id}`,
    source: 'nolbal',
    title: str(d.content_name) as string,
    sido,
    gugun: str(d.short_address?.gugun),
    place: str(d.branch?.branch_name),
    address: str(d.branch?.branch_address),
    imageUrl: str(d.content_thumbnail),
    url: nolbalUrl(id),
    price:
      num(price.discount) !== null || num(price.original) !== null
        ? {
            original: num(price.original),
            sale: num(price.discount),
            percent: num(price.percent),
            option: str(price.option_name),
          }
        : null,
    minAge: num(d.content_recommended_min_age),
    maxAge: num(d.content_recommended_max_age),
    rating: num(review.star) || null,
    reviewCount: num(review.count),
    sameDay:
      typeof d.information?.raw_usable_the_day === 'boolean'
        ? d.information.raw_usable_the_day
        : null,
    availableUntil: str(d.content_available_date),
    categories: [
      ...new Set(
        (Array.isArray(d.categories) ? d.categories : [])
          .flatMap((c: Record<string, unknown>) => [str(c.category_name), str(c.sub_category_name)])
          .filter((c: string | null): c is string => Boolean(c))
      ),
    ] as string[],
  };
}

/**
 * 이번에 받을 상품: 처음 보는 것 먼저, 그다음 오래전에 받은 것부터. 최대 budget개.
 */
export function pickToRefresh(
  ids: string[],
  cache: Record<string, PaidCacheEntry>,
  budget: number
): string[] {
  const fresh = ids.filter((id) => !cache[id]);
  const known = ids
    .filter((id) => cache[id])
    .sort((a, b) => cache[a].fetchedAt.localeCompare(cache[b].fetchedAt));
  return [...fresh, ...known].slice(0, budget);
}

export async function collectNolbal(
  previous: Record<string, PaidCacheEntry>,
  options: { budget: number; delayMs: number; now?: Date; get?: HttpGet }
): Promise<{ cache: Record<string, PaidCacheEntry>; fetched: number; failed: number }> {
  const get = options.get ?? defaultGet;
  const now = options.now ?? new Date();
  const ids = parseSitemapIds(String(await get(NOLBAL_SITEMAP)));
  if (ids.length === 0) throw new Error('사이트맵에서 상품을 찾지 못했습니다');

  // 사이트맵에서 빠진 상품(판매 종료)은 지운다
  const cache: Record<string, PaidCacheEntry> = {};
  for (const id of ids) if (previous[id]) cache[id] = previous[id];

  let fetched = 0;
  let failed = 0;
  for (const id of pickToRefresh(ids, cache, options.budget)) {
    try {
      const html = String(await get(nolbalUrl(id)));
      cache[id] = { fetchedAt: now.toISOString(), item: parseNolbalDetail(html, id) };
      fetched++;
    } catch {
      failed++;
    }
    if (options.delayMs > 0) await sleep(options.delayMs);
  }
  return { cache, fetched, failed };
}

// ── 대한민국 구석구석 (TourAPI) ─────────────────────────────

const TOUR_AREAS: Array<{ code: number; sido: string }> = [
  { code: 1, sido: '서울' },
  { code: 2, sido: '인천' },
  { code: 31, sido: '경기' },
];

/** 체험관광지(관광지 A0203)와 문화시설(박물관·과학관 등) */
const TOUR_QUERIES: Array<{ contentTypeId: number; cat2?: string; label: string }> = [
  { contentTypeId: 12, cat2: 'A0203', label: '체험관광지' },
  { contentTypeId: 14, label: '문화시설' },
];

interface TourPlace {
  contentid?: string;
  title?: string;
  addr1?: string;
  firstimage?: string;
}

export function mapTourPlace(item: TourPlace, sido: string, label: string): PaidItem | null {
  if (!item.title || !item.contentid) return null;
  const title = decodeHtml(item.title);
  const gugun =
    (item.addr1 ?? '')
      .split(/\s+/)
      .slice(1, 3)
      .find((p) => /[시군구]$/.test(p)) ?? null;
  return {
    id: `visitkorea-${item.contentid}`,
    source: 'visitkorea',
    title,
    sido,
    gugun,
    place: title,
    address: str(item.addr1),
    imageUrl: str(item.firstimage),
    url: `https://korean.visitkorea.or.kr/search/search_list.do?keyword=${encodeURIComponent(title)}`,
    price: null,
    minAge: null,
    maxAge: null,
    rating: null,
    reviewCount: null,
    sameDay: null,
    availableUntil: null,
    categories: [label],
  };
}

export async function fetchTourPlaces(
  apiKey: string,
  get: HttpGet = defaultGet
): Promise<PaidItem[]> {
  const serviceKey = normalizeServiceKey(apiKey);
  const items: PaidItem[] = [];
  for (const area of TOUR_AREAS) {
    for (const query of TOUR_QUERIES) {
      for (let pageNo = 1; pageNo <= 10; pageNo++) {
        const data = (await get('https://apis.data.go.kr/B551011/KorService2/areaBasedList2', {
          serviceKey,
          MobileOS: 'ETC',
          MobileApp: 'WITHKIDS',
          _type: 'json',
          numOfRows: 500,
          pageNo,
          arrange: 'Q',
          areaCode: area.code,
          contentTypeId: query.contentTypeId,
          ...(query.cat2 ? { cat1: 'A02', cat2: query.cat2 } : {}),
        })) as {
          response?: {
            header?: { resultCode?: string; resultMsg?: string };
            body?: { totalCount?: number; items?: { item?: TourPlace[] | TourPlace } | '' };
          };
        };
        const header = data?.response?.header;
        if (!data?.response || (header?.resultCode && header.resultCode !== '0000')) {
          throw new Error(
            `관광공사 응답 오류: ${header?.resultCode ?? ''} ${header?.resultMsg ?? JSON.stringify(data).slice(0, 150)}`.trim()
          );
        }
        const body = data.response.body;
        const raw = body?.items && typeof body.items === 'object' ? body.items.item : [];
        const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
        items.push(
          ...list
            .map((i) => mapTourPlace(i, area.sido, query.label))
            .filter((i): i is PaidItem => i !== null)
        );
        if (list.length < 500 || pageNo * 500 >= (body?.totalCount ?? 0)) break;
      }
    }
  }
  return items;
}

// ── 합치기 ─────────────────────────────────────────────────

export function inRegion(item: PaidItem): boolean {
  return (PAID_REGIONS as readonly string[]).includes(item.sido);
}

export async function collectPaid(options: {
  previousCache: PaidCache | null;
  tourKey?: string;
  budget?: number;
  delayMs?: number;
  now?: Date;
  get?: HttpGet;
}): Promise<{ file: PaidFile; cache: PaidCache }> {
  const now = options.now ?? new Date();
  const get = options.get ?? defaultGet;
  const sources: PaidFile['sources'] = [];
  const items: PaidItem[] = [];
  let nolbalCache = options.previousCache?.nolbal ?? {};

  try {
    const result = await collectNolbal(nolbalCache, {
      budget: options.budget ?? 500,
      delayMs: options.delayMs ?? 700,
      now,
      get,
    });
    nolbalCache = result.cache;
    const found = Object.values(nolbalCache)
      .map((e) => e.item)
      .filter((i): i is PaidItem => i !== null && inRegion(i));
    items.push(...found);
    const total = Object.keys(nolbalCache).length;
    sources.push({
      id: 'nolbal',
      name: '놀이의발견',
      ok: true,
      found: found.length,
      errorMessage: null,
      note: `이번에 ${result.fetched}개 확인 · 전체 ${total}개 중 수도권 ${found.length}개${result.failed ? ` · ${result.failed}개 실패` : ''}`,
    });
  } catch (error) {
    // 실패해도 지난번 결과는 보여준다
    items.push(
      ...Object.values(nolbalCache)
        .map((e) => e.item)
        .filter((i): i is PaidItem => i !== null && inRegion(i))
    );
    sources.push({
      id: 'nolbal',
      name: '놀이의발견',
      ok: false,
      found: 0,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }

  if (options.tourKey?.trim()) {
    try {
      const places = await fetchTourPlaces(options.tourKey, get);
      items.push(...places);
      sources.push({
        id: 'visitkorea',
        name: '대한민국 구석구석',
        ok: true,
        found: places.length,
        errorMessage: null,
      });
    } catch (error) {
      sources.push({
        id: 'visitkorea',
        name: '대한민국 구석구석',
        ok: false,
        found: 0,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  } else {
    sources.push({
      id: 'visitkorea',
      name: '대한민국 구석구석',
      ok: false,
      found: 0,
      errorMessage:
        '관광공사 인증키(TOUR_API_KEY)를 넣으면 체험관광지·문화시설 목록이 함께 나와요.',
    });
  }

  return {
    file: { generatedAt: now.toISOString(), sources, items },
    cache: { nolbal: nolbalCache },
  };
}
