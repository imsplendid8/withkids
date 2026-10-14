import {
  FESTIVALS_RAW,
  INDOOR_CATEGORIES,
  PLACES_RAW,
  TOURS_RAW,
  type PlaceCategory,
} from '@/data/placesGuide';
import { parseAgeRule, parsePlacesText, type AgeRule, type Place as MemoPlace } from './places';

/**
 * 장소 가이드: 모두가 같이 보는 정리된 목록 + 사람마다 따로 남기는 표시(가 봄·또 갈 곳…).
 * 표시는 계정에 저장한다 (withdkis.* 키).
 */
export const MY_PLACES_KEY = 'withdkis.places';

export type Sido = string;
export type Region = 'seoul' | 'metro' | 'other';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface GuidePlace {
  id: string;
  sido: Sido;
  sigungu: string;
  name: string;
  category: PlaceCategory;
  indoor: boolean;
  outdoor: boolean;
  seasons: Season[];
  night: boolean;
  weekdayOnly: boolean;
  note: string;
  aliases: string[];
  /** 사용자가 직접 추가한 곳 */
  custom?: boolean;
}

export interface GuideTour {
  id: string;
  label: string;
  rule: AgeRule;
  name: string;
  sido: string;
  note: string;
  aliases: string[];
}

export interface GuideFestival {
  id: string;
  months: number[];
  name: string;
  sido: string;
  sigungu: string;
  note: string;
}

export interface PlaceMark {
  visited?: boolean;
  revisit?: boolean;
  want?: boolean;
  kidNotYet?: boolean;
  memo?: string;
}

export interface MyPlaces {
  version: 2;
  marks: Record<string, PlaceMark>;
  custom: GuidePlace[];
}

export const EMPTY_MY_PLACES: MyPlaces = { version: 2, marks: {}, custom: [] };

// ── 목록 읽기 ────────────────────────────────────────────────

const SEASON_TAGS: Record<string, Season> = {
  봄: 'spring',
  여름: 'summer',
  가을: 'autumn',
  단풍: 'autumn',
  겨울: 'winter',
};

const rows = (raw: string) =>
  raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split('|').map((c) => c.trim()));

export function regionOf(sido: string): Region {
  if (sido === '서울') return 'seoul';
  if (sido === '경기' || sido === '인천') return 'metro';
  return 'other';
}

function buildPlace(
  sido: string,
  sigungu: string,
  name: string,
  category: PlaceCategory,
  tagText: string,
  note: string,
  aliases: string[],
  custom = false
): GuidePlace {
  const tags = tagText ? tagText.split(',').map((t) => t.trim()) : [];
  const indoorByCategory = INDOOR_CATEGORIES.includes(category);
  // 종류를 모르는 곳(기타)은 실내·야외를 짐작하지 않는다
  const unknown = category === '기타';
  const indoor = tags.includes('실내') || (!unknown && !tags.includes('야외') && indoorByCategory);
  const outdoor =
    tags.includes('야외') || (!unknown && !tags.includes('실내') && !indoorByCategory);
  return {
    id: `${sido}|${sigungu}|${name}`,
    sido,
    sigungu,
    name,
    category,
    indoor,
    outdoor,
    seasons: [...new Set(tags.map((t) => SEASON_TAGS[t]).filter(Boolean))],
    night: tags.includes('야경'),
    weekdayOnly: tags.includes('평일'),
    note,
    aliases,
    custom: custom || undefined,
  };
}

export const GUIDE_PLACES: GuidePlace[] = rows(PLACES_RAW).map(
  ([sido, sigungu, name, category, tags, note, aliases]) =>
    buildPlace(
      sido,
      sigungu,
      name,
      category as PlaceCategory,
      tags,
      note,
      aliases ? aliases.split(';') : []
    )
);

export const GUIDE_TOURS: GuideTour[] = rows(TOURS_RAW).map(
  ([label, name, sido, note, aliases]) => ({
    id: `${label}|${name}`,
    label,
    rule: parseAgeRule(label),
    name,
    sido,
    note,
    aliases: aliases ? aliases.split(';') : [],
  })
);

export const GUIDE_FESTIVALS: GuideFestival[] = rows(FESTIVALS_RAW).map(
  ([months, name, sido, sigungu, note]) => ({
    id: name,
    months: months.split(',').map(Number),
    name,
    sido,
    sigungu,
    note,
  })
);

export function makeCustomPlace(input: {
  name: string;
  sido: string;
  sigungu: string;
  category: PlaceCategory;
  note?: string;
}): GuidePlace {
  const place = buildPlace(
    input.sido.trim(),
    input.sigungu.trim(),
    input.name.trim(),
    input.category,
    '',
    input.note?.trim() ?? '',
    [],
    true
  );
  return { ...place, id: `my|${Date.now().toString(36)}|${place.name}` };
}

// ── 계절 ─────────────────────────────────────────────────────

export function seasonOf(date: Date): Season {
  const m = date.getMonth() + 1;
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

export const SEASON_LABEL: Record<Season, string> = {
  spring: '봄',
  summer: '여름',
  autumn: '가을',
  winter: '겨울',
};

// ── 내 표시 저장 ─────────────────────────────────────────────

export function loadMyPlaces(): MyPlaces {
  try {
    const raw = localStorage.getItem(MY_PLACES_KEY);
    if (!raw) return { ...EMPTY_MY_PLACES, marks: {}, custom: [] };
    const data = JSON.parse(raw) as Partial<MyPlaces> & { places?: MemoPlace[] };
    if (data.version === 2) {
      return {
        version: 2,
        marks: data.marks && typeof data.marks === 'object' ? data.marks : {},
        custom: Array.isArray(data.custom) ? data.custom : [],
      };
    }
    // 예전에 메모를 그대로 붙여넣어 둔 경우: 가이드의 같은 곳에 표시를 옮긴다
    return marksFromMemoPlaces(Array.isArray(data.places) ? data.places : []);
  } catch {
    return { ...EMPTY_MY_PLACES, marks: {}, custom: [] };
  }
}

export function saveMyPlaces(data: MyPlaces): void {
  localStorage.setItem(MY_PLACES_KEY, JSON.stringify(data));
}

export function hasMark(mark: PlaceMark | undefined): boolean {
  return Boolean(
    mark && (mark.visited || mark.revisit || mark.want || mark.kidNotYet || mark.memo)
  );
}

/** 표시를 바꾼다. 모두 꺼지면 지운다 */
export function setMark(data: MyPlaces, id: string, mark: PlaceMark): MyPlaces {
  const marks = { ...data.marks };
  if (hasMark(mark)) marks[id] = mark;
  else delete marks[id];
  return { ...data, marks };
}

// ── 메모 → 표시 ──────────────────────────────────────────────

const norm = (s: string) => s.replace(/\s/g, '').toLowerCase();
const stem = (s: string) => s.replace(/(특별시|광역시|특별자치시|특별자치도|도|시|군|구)$/, '');

/** 메모의 지역 이름이 가이드의 다른 이름으로 적힌 경우 */
const MEMO_REGION_HINTS: Record<string, string> = {
  일산: '고양',
  월미도: '인천 중구',
  천호: '강동',
  압구정: '강남',
};

function regionScore(place: GuidePlace, memoRegion: string): number {
  const label = MEMO_REGION_HINTS[memoRegion] ?? memoRegion;
  let score = 0;
  if (place.sigungu && label.includes(stem(place.sigungu))) score += 2;
  if (label.includes(place.sido)) score += 1;
  return score;
}

/** 이름(예전 이름 포함)으로 가이드의 장소를 찾는다. 같은 이름이 여러 곳이면 지역으로 고른다 */
export function findGuidePlace(name: string, memoRegion: string): GuidePlace | null {
  const key = norm(name);
  const candidates = GUIDE_PLACES.filter(
    (p) => norm(p.name) === key || p.aliases.some((a) => norm(a) === key)
  );
  if (candidates.length <= 1) return candidates[0] ?? null;
  return [...candidates].sort((a, b) => regionScore(b, memoRegion) - regionScore(a, memoRegion))[0];
}

function marksFromMemoPlaces(places: MemoPlace[]): MyPlaces {
  const result: MyPlaces = { version: 2, marks: {}, custom: [] };
  for (const memo of places) {
    const mark: PlaceMark = {
      visited: memo.visited || undefined,
      revisit: memo.revisit || undefined,
      kidNotYet: memo.kidNotYet || undefined,
      want: !memo.visited || undefined,
      memo: memo.memo,
    };
    const guide = findGuidePlace(memo.name, memo.region);
    if (guide) {
      const old = result.marks[guide.id] ?? {};
      result.marks[guide.id] = {
        visited: old.visited || mark.visited,
        revisit: old.revisit || mark.revisit,
        kidNotYet: old.kidNotYet || mark.kidNotYet,
        want: (old.want || mark.want) && !(old.visited || mark.visited) ? true : undefined,
        memo: old.memo ?? mark.memo,
      };
    }
    // 가이드에 없는 곳(축제·견학으로 옮긴 것 등)은 표시하지 않는다
  }
  return result;
}

/** 메모장 글에서 가 본 곳·☆ 표시만 가져와 가이드에 붙인다 */
export function importMarksFromMemo(
  current: MyPlaces,
  text: string
): { data: MyPlaces; matched: number; unmatched: string[] } {
  const parsed = parsePlacesText(text).places;
  const fromMemo = marksFromMemoPlaces(parsed);
  const marks = { ...current.marks };
  for (const [id, mark] of Object.entries(fromMemo.marks)) {
    const old = marks[id] ?? {};
    marks[id] = {
      visited: old.visited || mark.visited,
      revisit: old.revisit || mark.revisit,
      kidNotYet: old.kidNotYet || mark.kidNotYet,
      want: !(old.visited || mark.visited) && (old.want || mark.want) ? true : undefined,
      memo: old.memo ?? mark.memo,
    };
  }
  const unmatched = parsed
    .filter((p) => !findGuidePlace(p.name, p.region))
    .map((p) => `${p.region} ${p.name}`);
  return {
    data: { ...current, marks },
    matched: Object.keys(fromMemo.marks).length,
    unmatched,
  };
}

// ── 고르기 ───────────────────────────────────────────────────

export type MarkFilter = 'all' | 'notVisited' | 'visited' | 'revisit' | 'want';

export interface GuideFilter {
  region: Region | '';
  sigungu: string;
  category: PlaceCategory | '';
  indoor: boolean;
  outdoor: boolean;
  thisSeason: boolean;
  night: boolean;
  mark: MarkFilter;
  search: string;
}

export const DEFAULT_GUIDE_FILTER: GuideFilter = {
  region: '',
  sigungu: '',
  category: '',
  indoor: false,
  outdoor: false,
  thisSeason: false,
  night: false,
  mark: 'all',
  search: '',
};

export function placeArea(p: GuidePlace): string {
  return p.sigungu ? `${p.sido} ${p.sigungu}` : p.sido;
}

export function filterGuide(
  places: GuidePlace[],
  marks: Record<string, PlaceMark>,
  f: GuideFilter,
  today: Date
): GuidePlace[] {
  const season = seasonOf(today);
  const terms = f.search.split(/\s+/).map(norm).filter(Boolean);
  return places.filter((p) => {
    const mark = marks[p.id];
    if (f.region && regionOf(p.sido) !== f.region) return false;
    if (f.sigungu && placeArea(p) !== f.sigungu) return false;
    if (f.category && p.category !== f.category) return false;
    if (f.indoor && !p.indoor) return false;
    if (f.outdoor && !p.outdoor) return false;
    if (f.thisSeason && !p.seasons.includes(season)) return false;
    if (f.night && !p.night) return false;
    if (f.mark === 'visited' && !mark?.visited) return false;
    if (f.mark === 'notVisited' && mark?.visited) return false;
    if (f.mark === 'revisit' && !mark?.revisit) return false;
    if (f.mark === 'want' && !mark?.want) return false;
    if (terms.length) {
      // 여러 낱말이면 모두 들어 있어야 한다 ("과학관 노원")
      const text = norm(`${p.name}${p.sido}${p.sigungu}${p.note}${p.category}${mark?.memo ?? ''}`);
      if (!terms.every((t) => text.includes(t))) return false;
    }
    return true;
  });
}

/** 시군구별로 묶는다 (서울 → 경기·인천 → 그 밖, 같은 지역 안은 처음 순서) */
export function groupByArea(places: GuidePlace[]): Array<{ area: string; places: GuidePlace[] }> {
  const order: Record<Region, number> = { seoul: 0, metro: 1, other: 2 };
  const groups = new Map<string, GuidePlace[]>();
  for (const p of places) {
    const key = placeArea(p);
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  return [...groups]
    .map(([area, list]) => ({ area, places: list }))
    .sort((a, b) => order[regionOf(a.places[0].sido)] - order[regionOf(b.places[0].sido)]);
}

export function festivalsInMonth(month: number): GuideFestival[] {
  return GUIDE_FESTIVALS.filter((f) => f.months.includes(month));
}
