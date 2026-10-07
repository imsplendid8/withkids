import { BASE_PATH } from './staticMode';
import { childFacts, type Child } from './eligibility';

/** apps/api/src/paid/paid.ts 가 만드는 paid.json 형태 */
export interface PaidItem {
  id: string;
  source: 'nolbal' | 'visitkorea';
  title: string;
  sido: string;
  gugun: string | null;
  place: string | null;
  address: string | null;
  imageUrl: string | null;
  url: string;
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
  sameDay: boolean | null;
  availableUntil: string | null;
  categories: string[];
}

export interface PaidFile {
  generatedAt: string | null;
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

const EMPTY: PaidFile = { generatedAt: null, sources: [], items: [] };

export async function loadPaid(): Promise<PaidFile> {
  try {
    const response = await fetch(`${BASE_PATH}/data/paid.json`, { cache: 'no-cache' });
    return response.ok ? ((await response.json()) as PaidFile) : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** "강남구"·"강남", "부천시"·"부천"을 같은 이름으로 묶는다 */
export function normalizeGugun(name: string | null): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  const short = trimmed.replace(/[시군구]$/, '');
  return short.length >= 2 ? short : trimmed;
}

/** 아이 나이(만)가 추천 나이 범위 안인지. 나이 정보가 없으면 누구나로 본다 */
export function ageFits(item: PaidItem, child: Child, on: Date = new Date()): boolean {
  if (item.minAge === null && item.maxAge === null) return true;
  const age = childFacts(child.birthDate, on).age;
  return (
    (item.minAge === null || age >= item.minAge) && (item.maxAge === null || age <= item.maxAge)
  );
}

export type PaidSort = 'recommended' | 'discount' | 'price';
/** all / kids(아이 모두) / child:<id> */
export type PaidWho = 'all' | 'kids' | `child:${string}`;

export interface PaidFilter {
  region: string;
  gugun: string;
  category: string;
  who: PaidWho;
  sameDayOnly: boolean;
  source: '' | PaidItem['source'];
  search: string;
  sort: PaidSort;
}

/** 후기가 많고 평점이 높은 것 (후기 수는 로그로 눌러 소수 고평점이 너무 앞서지 않게) */
const recommendScore = (item: PaidItem) =>
  (item.rating ?? 0) * Math.log10((item.reviewCount ?? 0) + 1) +
  (item.source === 'nolbal' ? 0.01 : 0);

export function filterPaid(
  items: PaidItem[],
  filter: PaidFilter,
  children: Child[],
  now: Date = new Date()
): PaidItem[] {
  const query = filter.search.trim().toLowerCase();
  const list = items.filter((item) => {
    if (filter.region && item.sido !== filter.region) return false;
    if (filter.gugun && normalizeGugun(item.gugun) !== filter.gugun) return false;
    if (filter.category && !item.categories.includes(filter.category)) return false;
    if (filter.source && item.source !== filter.source) return false;
    if (filter.sameDayOnly && item.sameDay !== true) return false;
    if (filter.who === 'kids' && !children.every((c) => ageFits(item, c, now))) return false;
    if (filter.who.startsWith('child:')) {
      const child = children.find((c) => `child:${c.id}` === filter.who);
      if (child && !ageFits(item, child, now)) return false;
    }
    if (query) {
      const haystack = `${item.title} ${item.place ?? ''} ${item.gugun ?? ''} ${item.categories.join(' ')}`;
      if (!haystack.toLowerCase().includes(query)) return false;
    }
    return true;
  });

  const price = (item: PaidItem) => item.price?.sale ?? item.price?.original ?? Infinity;
  switch (filter.sort) {
    case 'discount':
      return [...list].sort((a, b) => (b.price?.percent ?? -1) - (a.price?.percent ?? -1));
    case 'price':
      return [...list].sort((a, b) => price(a) - price(b));
    default:
      return [...list].sort((a, b) => recommendScore(b) - recommendScore(a));
  }
}

export function countBy(values: Array<string | null>): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ko'));
}

export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

/** 직접 크롤링하지 않는 곳(로봇 수집 금지 등)은 검색 바로가기로 연결한다 */
export function externalSearchLinks(keyword: string): Array<{ name: string; url: string }> {
  const q = encodeURIComponent(keyword);
  return [
    { name: '마이리얼트립', url: `https://www.myrealtrip.com/search?keyword=${q}` },
    {
      name: '대한민국 구석구석',
      url: `https://korean.visitkorea.or.kr/search/search_list.do?keyword=${q}`,
    },
    { name: '프립', url: `https://frip.co.kr/search?keyword=${q}` },
    { name: '놀이의발견', url: 'https://nolbal.com/' },
  ];
}
