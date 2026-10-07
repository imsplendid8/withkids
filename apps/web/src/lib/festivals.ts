import { BASE_PATH } from './staticMode';
import { parseYmd, toLocalYmd } from './bookingDates';

/** apps/api/src/festivals/festivals.ts 가 만드는 festivals.json 형태 */
export type FestivalRegion = '서울' | '경기' | '인천';

export interface Festival {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  region: FestivalRegion;
  district: string | null;
  place: string | null;
  imageUrl: string | null;
  isFree: boolean | null;
  fee: string | null;
  target: string | null;
  category: string | null;
  link: string | null;
  source: 'seoul-culture' | 'tour-api';
}

export interface FestivalsFile {
  generatedAt: string | null;
  sources: Array<{ name: string; ok: boolean; found: number; errorMessage: string | null }>;
  festivals: Festival[];
}

const EMPTY: FestivalsFile = { generatedAt: null, sources: [], festivals: [] };

export async function loadFestivals(): Promise<FestivalsFile> {
  try {
    const response = await fetch(`${BASE_PATH}/data/festivals.json`, { cache: 'no-cache' });
    return response.ok ? ((await response.json()) as FestivalsFile) : EMPTY;
  } catch {
    return EMPTY;
  }
}

export type FestivalPeriod = 'weekend' | 'two-weeks' | 'month' | 'all';

/** 기간 필터의 [시작, 끝] (YYYY-MM-DD). 'all'은 오늘부터 끝없이 */
export function periodRange(period: FestivalPeriod, now: Date = new Date()): [string, string] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const plus = (days: number) => new Date(today.getTime() + days * 86400000);
  switch (period) {
    case 'weekend': {
      // 이번 토·일 (일요일이면 오늘 하루)
      const day = today.getDay();
      if (day === 0) return [toLocalYmd(today), toLocalYmd(today)];
      const saturday = plus(6 - day);
      return [toLocalYmd(saturday), toLocalYmd(plus(7 - day))];
    }
    case 'two-weeks':
      return [toLocalYmd(today), toLocalYmd(plus(13))];
    case 'month':
      return [
        toLocalYmd(today),
        toLocalYmd(new Date(today.getFullYear(), today.getMonth() + 1, 0)),
      ];
    default:
      return [toLocalYmd(today), '9999-12-31'];
  }
}

export function filterFestivals(
  festivals: Festival[],
  options: {
    region: FestivalRegion | '';
    district: string;
    period: FestivalPeriod;
    search: string;
  },
  now: Date = new Date()
): Festival[] {
  const [from, to] = periodRange(options.period, now);
  const query = options.search.trim().toLowerCase();
  return festivals.filter(
    (f) =>
      f.startDate <= to &&
      f.endDate >= from &&
      (!options.region || f.region === options.region) &&
      (!options.district || f.district === options.district) &&
      (!query || `${f.title} ${f.place ?? ''} ${f.district ?? ''}`.toLowerCase().includes(query))
  );
}

/** 지역 안의 시·구 목록 (축제 수 많은 순) */
export function districtsOf(
  festivals: Festival[],
  region: FestivalRegion | ''
): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const f of festivals) {
    if (region && f.region !== region) continue;
    if (f.district) counts.set(f.district, (counts.get(f.district) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

const dot = (ymd: string) => `${Number(ymd.slice(5, 7))}.${Number(ymd.slice(8, 10))}`;

/** "진행 중 · 10.12까지", "D-3 · 10.4 ~ 10.6", "10.4" */
export function festivalPeriodLabel(festival: Festival, now: Date = new Date()): string {
  const today = toLocalYmd(now);
  const range =
    festival.startDate === festival.endDate
      ? dot(festival.startDate)
      : `${dot(festival.startDate)} ~ ${dot(festival.endDate)}`;
  if (festival.startDate <= today) {
    return festival.endDate === today ? '오늘 마지막 날' : `진행 중 · ${dot(festival.endDate)}까지`;
  }
  const days = Math.round(
    (parseYmd(festival.startDate).getTime() - parseYmd(today).getTime()) / 86400000
  );
  return `${days === 1 ? '내일' : `D-${days}`} · ${range}`;
}
