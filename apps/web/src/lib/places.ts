import { childFacts, type Child } from './eligibility';

/**
 * 내 장소 노트: 가 본 곳·가 볼 곳·또 갈 곳, 나이 제한 있는 견학, 달마다 열리는 축제 메모.
 * 계정에 함께 저장한다 (withdkis.* 키).
 *
 * 메모장에 적던 형식을 그대로 붙여넣을 수 있다.
 *   강서 : 가볼곳1 가볼곳2 / 가본곳1 ☆또갈곳 ◇아이는안가본곳
 *   --------            (여기부터 근교·지방)
 *   초1 : 견학1 견학2    (나이 제한 있는 견학)
 *   ----                (여기부터 달마다 열리는 축제)
 *   5월 축제1 축제2
 */
export const PLACES_KEY = 'withdkis.places';

export type PlaceArea = 'seoul' | 'nearby';

export interface Place {
  id: string;
  name: string;
  /** 지역 이름 그대로 (강서, 인천 중구, 일산 …) */
  region: string;
  area: PlaceArea;
  visited: boolean;
  /** ☆ 또 갈 곳 */
  revisit: boolean;
  /** ◇ 보호자만 가 봤고 아이는 아직 */
  kidNotYet: boolean;
  memo?: string;
}

export type AgeRule =
  { kind: 'any' } | { kind: 'age'; min: number } | { kind: 'grade'; min: number; max?: number };

export interface TourNote {
  id: string;
  name: string;
  /** 사용자가 적은 그대로 (초1, 6세, 모든연령 …) */
  label: string;
  rule: AgeRule;
}

export interface MonthNote {
  id: string;
  name: string;
  months: number[];
}

export interface PlacesData {
  places: Place[];
  tours: TourNote[];
  months: MonthNote[];
}

export const EMPTY_PLACES: PlacesData = { places: [], tours: [], months: [] };

// ── 붙여넣기 읽기 ─────────────────────────────────────────────

const SEOUL_DISTRICTS = [
  '종로',
  '중구',
  '용산',
  '성동',
  '광진',
  '동대문',
  '중랑',
  '성북',
  '강북',
  '도봉',
  '노원',
  '은평',
  '서대문',
  '마포',
  '양천',
  '강서',
  '구로',
  '금천',
  '영등포',
  '동작',
  '관악',
  '서초',
  '강남',
  '송파',
  '강동',
];

export function isSeoulRegion(region: string): boolean {
  const name = region.replace(/^서울(특별시|시)?\s*/, '').replace(/구$/, '');
  return SEOUL_DISTRICTS.some((d) => d.replace(/구$/, '') === name);
}

const AGE_LABEL = /^(초\s*\d|초등|중학생|중등|고등학생|\d{1,2}\s*세|모든\s*연령|전\s*연령)/;

export function parseAgeRule(label: string): AgeRule {
  const text = label.replace(/\s/g, '');
  const grade = text.match(/^초(\d)/);
  if (grade) return { kind: 'grade', min: Number(grade[1]) };
  if (/^초등/.test(text)) return { kind: 'grade', min: 1, max: 6 };
  if (/^(중학생|중등)/.test(text)) return { kind: 'grade', min: 7 };
  if (/^고등/.test(text)) return { kind: 'grade', min: 10 };
  const age = text.match(/^(\d{1,2})세/);
  if (age) return { kind: 'age', min: Number(age[1]) };
  return { kind: 'any' };
}

/** 괄호 밖의 구분자로만 나눈다 ("뮌스터담(눈썰매장/물놀이)"의 /는 그대로) */
function splitOutside(text: string, isSeparator: (ch: string) => boolean): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of text) {
    if (ch === '(' || ch === '（') depth++;
    if ((ch === ')' || ch === '）') && depth > 0) depth--;
    if (depth === 0 && isSeparator(ch)) {
      parts.push(current);
      current = '';
    } else current += ch;
  }
  parts.push(current);
  return parts;
}

interface Token {
  name: string;
  revisit: boolean;
  kidNotYet: boolean;
}

/** 혼자서는 장소가 아닌 지역 이름. 앞뒤 이름에 붙인다 ("경기 평택 요구르트", "농심 구미 부산") */
const LOCATION_WORDS = new Set(
  (
    '서울 경기 인천 강원 충남 충북 전남 전북 경남 경북 제주 부산 대구 대전 울산 광주 세종 ' +
    '수원 성남 용인 고양 일산 파주 김포 부천 안산 안양 평택 화성 시흥 광명 군포 의왕 과천 하남 ' +
    '구리 남양주 양주 의정부 동두천 포천 연천 가평 양평 여주 이천 안성 오산 춘천 원주 강릉 ' +
    '속초 횡성 천안 아산 공주 부여 서산 태안 청주 충주 전주 군산 여수 순천 목포 포항 경주 ' +
    '구미 안동 창원 김해 진주 거제 통영 여의도'
  ).split(' ')
);

const isLocation = (word: string) => LOCATION_WORDS.has(word.replace(/^[☆★◇◆]+/, ''));

/** 띄어 쓴 지역 이름을 이웃 이름에 붙인다 */
function attachLocations(words: string[]): string[] {
  const out: string[] = [];
  let prefix: string[] = [];
  const trailing: string[] = [];
  const flushTrailing = () => {
    if (trailing.length && out.length) out[out.length - 1] += ` (${trailing.join('·')})`;
    trailing.length = 0;
  };
  for (const word of words) {
    if (isLocation(word)) {
      // 앞에 이름이 있고 지역이 이어지면 뒤에 붙는 지역 ("농심 구미 부산")
      if (out.length && (trailing.length || prefix.length === 0)) trailing.push(word);
      else prefix.push(word);
      continue;
    }
    const marks = word.match(/^[☆★◇◆]+/)?.[0] ?? '';
    if (trailing.length) {
      // 지역 다음에 이름이 오면 마지막 지역 하나는 다음 이름 앞에 붙는다고 본다.
      // 다음 이름에 ☆·◇ 표시가 있으면 새 항목이 시작된 것이라 모두 앞 이름 몫이다
      if (!marks) prefix = [trailing.pop() as string];
      flushTrailing();
    }
    out.push(marks + [...prefix, word.slice(marks.length)].join(' '));
    prefix = [];
  }
  if (prefix.length) trailing.push(...prefix);
  if (out.length) flushTrailing();
  else if (trailing.length) out.push(trailing.join(' '));
  return out;
}

/** 한 칸 안의 이름들. 쉼표가 있으면 쉼표로, 없으면 띄어쓰기로 나눈다 */
export function splitNames(text: string): Token[] {
  const bySpace = (t: string) => splitOutside(t, (ch) => /\s/.test(ch));
  const raw = text.includes(',')
    ? // 쉼표 사이가 세 단어 이상이면 쉼표를 빼먹은 것으로 보고 띄어쓰기로도 나눈다
      text.split(',').flatMap((chunk) => {
        const words = bySpace(chunk.trim()).filter(Boolean);
        return words.length >= 3 ? words : [chunk];
      })
    : bySpace(text);
  const words = raw.map((w) => w.trim()).filter(Boolean);

  // "청년몰 & 실감형" → 한 이름, "☆ 파라다이스시티" → 표시를 다음 이름에 붙인다
  const merged: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (word === '&' && merged.length && words[i + 1]) {
      merged[merged.length - 1] += ` & ${words[++i]}`;
    } else if (/^[☆★◇◆]+$/.test(word) && words[i + 1]) {
      words[i + 1] = word + words[i + 1];
    } else if (/^\(.*\)$/.test(word) && merged.length) {
      // "어뮤즈스파 (진주)" 처럼 띄어 쓴 괄호는 앞 이름에 붙인다
      merged[merged.length - 1] += ` ${word}`;
    } else merged.push(word);
  }

  return attachLocations(merged)
    .map((word) => {
      const marks = word.match(/^[☆★◇◆]+/)?.[0] ?? '';
      return {
        name: word.slice(marks.length).trim(),
        revisit: /[☆★]/.test(marks),
        kidNotYet: /[◇◆]/.test(marks),
      };
    })
    .filter((t) => t.name.length > 0);
}

let idSeq = 0;
const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(idSeq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** 메모장 형식의 글을 장소·견학·월별 축제로 나눈다 */
export function parsePlacesText(text: string): PlacesData {
  const result: PlacesData = { places: [], tours: [], months: [] };
  let separators = 0;
  let mode: 'places' | 'tours' | 'months' = 'places';
  let region: string | null = null;
  let tourLabel: string | null = null;
  let lastVisited = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    // 구분선: 첫 번째는 서울 → 근교, 두 번째는 달마다 열리는 축제
    if (/^[-‐‑–—_=]{3,}$/.test(line)) {
      separators++;
      if (separators >= 2) mode = 'months';
      region = null;
      continue;
    }

    const month = line.match(/^(\d{1,2})\s*월\s+(.+)$/);
    if (month || mode === 'months') {
      mode = 'months';
      const range = line.match(/\((\d{1,2})\s*[~\-–]\s*(\d{1,2})\s*월\)/);
      let months: number[];
      let body: string;
      if (month) {
        months = [Number(month[1])];
        body = month[2];
      } else if (range) {
        const [from, to] = [Number(range[1]), Number(range[2])];
        months = Array.from({ length: Math.max(0, to - from) + 1 }, (_, i) => from + i);
        body = line.replace(range[0], '');
      } else continue;
      for (const { name } of splitNames(body)) {
        if (months.every((m) => m >= 1 && m <= 12))
          result.months.push({ id: newId('m'), name, months });
      }
      continue;
    }

    const labelled = line.match(/^([^:：☆★◇◆]{1,20}?)\s*[:：]\s*(.*)$/);
    let body = line;
    let continuation = true;
    if (labelled) {
      continuation = false;
      body = labelled[2];
      const label = labelled[1].trim();
      if (AGE_LABEL.test(label)) {
        mode = 'tours';
        tourLabel = label;
        region = null;
      } else {
        mode = 'places';
        region = label;
        tourLabel = null;
      }
    }

    if (mode === 'tours') {
      if (!tourLabel) continue;
      for (const { name } of splitNames(body)) {
        result.tours.push({
          id: newId('t'),
          name,
          label: tourLabel,
          rule: parseAgeRule(tourLabel),
        });
      }
      continue;
    }

    // 지역이 나오기 전의 줄(설명 등)은 건너뛴다
    if (!region) continue;
    const placeRegion = region;

    // "가볼 곳 / 가본 곳". / 가 없는 이어진 줄은 앞 줄이 끝난 쪽을 따른다
    const sides = splitOutside(body, (ch) => ch === '/');
    const area: PlaceArea = separators === 0 || isSeoulRegion(placeRegion) ? 'seoul' : 'nearby';
    sides.forEach((side, index) => {
      const visited = sides.length > 1 ? index > 0 : continuation ? lastVisited : false;
      for (const token of splitNames(side)) {
        result.places.push({
          id: newId('p'),
          name: token.name,
          region: placeRegion,
          area,
          // ☆ 또 갈 곳은 가 본 곳이다
          visited: visited || token.revisit || token.kidNotYet,
          revisit: token.revisit,
          kidNotYet: token.kidNotYet,
        });
      }
    });
    lastVisited = sides.length > 1 ? true : continuation ? lastVisited : false;
  }

  return result;
}

const keyOf = (region: string, name: string) => `${region}|${name}`.replace(/\s/g, '');

/** 붙여넣은 내용을 기존 노트에 더한다. 같은 지역·이름이면 표시만 합친다 */
export function mergePlaces(current: PlacesData, incoming: PlacesData): PlacesData {
  const places = [...current.places];
  const index = new Map(places.map((p, i) => [keyOf(p.region, p.name), i]));
  for (const place of incoming.places) {
    const at = index.get(keyOf(place.region, place.name));
    if (at === undefined) {
      index.set(keyOf(place.region, place.name), places.length);
      places.push(place);
    } else {
      const old = places[at];
      places[at] = {
        ...old,
        visited: old.visited || place.visited,
        revisit: old.revisit || place.revisit,
        kidNotYet: old.kidNotYet && place.kidNotYet,
      };
    }
  }
  const tourKeys = new Set(current.tours.map((t) => keyOf(t.label, t.name)));
  const monthKeys = new Set(current.months.map((m) => keyOf(m.months.join(','), m.name)));
  return {
    places,
    tours: [
      ...current.tours,
      ...incoming.tours.filter((t) => !tourKeys.has(keyOf(t.label, t.name))),
    ],
    months: [
      ...current.months,
      ...incoming.months.filter((m) => !monthKeys.has(keyOf(m.months.join(','), m.name))),
    ],
  };
}

// ── 저장 ─────────────────────────────────────────────────────

export function loadPlaces(): PlacesData {
  try {
    const raw = localStorage.getItem(PLACES_KEY);
    const data = raw ? (JSON.parse(raw) as Partial<PlacesData>) : {};
    return {
      places: Array.isArray(data.places) ? data.places : [],
      tours: Array.isArray(data.tours) ? data.tours : [],
      months: Array.isArray(data.months) ? data.months : [],
    };
  } catch {
    return { ...EMPTY_PLACES };
  }
}

export function savePlaces(data: PlacesData): void {
  localStorage.setItem(PLACES_KEY, JSON.stringify(data));
}

export function createPlace(
  input: Pick<Place, 'name' | 'region'> & Partial<Omit<Place, 'id' | 'name' | 'region'>>
): Place {
  const region = input.region.trim();
  return {
    id: newId('p'),
    name: input.name.trim(),
    region,
    area: input.area ?? (isSeoulRegion(region) ? 'seoul' : 'nearby'),
    visited: input.visited ?? false,
    revisit: input.revisit ?? false,
    kidNotYet: input.kidNotYet ?? false,
    memo: input.memo,
  };
}

// ── 보여 주기 ────────────────────────────────────────────────

export type PlaceFilter = 'all' | 'todo' | 'visited' | 'revisit' | 'kidNotYet';

export function matchesPlaceFilter(place: Place, filter: PlaceFilter): boolean {
  switch (filter) {
    case 'todo':
      return !place.visited;
    case 'visited':
      return place.visited;
    case 'revisit':
      return place.revisit;
    case 'kidNotYet':
      return place.kidNotYet;
    default:
      return true;
  }
}

/** 지역별로 묶는다 (처음 나온 순서 유지) */
export function groupByRegion(places: Place[]): Array<{ region: string; places: Place[] }> {
  const groups = new Map<string, Place[]>();
  for (const place of places) {
    const list = groups.get(place.region) ?? [];
    list.push(place);
    groups.set(place.region, list);
  }
  return [...groups].map(([region, list]) => ({ region, places: list }));
}

/** 지도 검색은 괄호 속 설명을 빼고 지역을 붙인다 */
export function mapSearchUrl(place: Pick<Place, 'name' | 'region'>): string {
  const name = place.name.replace(/\s*[(（][^)）]*[)）]?/g, '').trim();
  const region = place.region.replace(/[/].*$/, '').trim();
  return `https://map.naver.com/p/search/${encodeURIComponent(`${region} ${name}`)}`;
}

export interface TourFit {
  childName: string;
  ok: boolean;
  /** 아직이면 언제부터 */
  from?: string;
}

/** 견학 나이 제한을 아이마다 따진다 */
export function tourFits(
  rule: AgeRule,
  children: Child[],
  today: Date,
  names: string[]
): TourFit[] {
  return children.map((child, i) => {
    const facts = childFacts(child.birthDate, today);
    const name = names[i] ?? child.name;
    if (rule.kind === 'any') return { childName: name, ok: true };
    if (rule.kind === 'age') {
      if (facts.age >= rule.min) return { childName: name, ok: true };
      const [y, m] = child.birthDate.split('-').map(Number);
      return { childName: name, ok: false, from: `${y + rule.min}년 ${m}월부터` };
    }
    const tooOld = rule.max !== undefined && facts.grade > rule.max;
    if (facts.grade >= rule.min && !tooOld) return { childName: name, ok: true };
    if (tooOld) return { childName: name, ok: false };
    return { childName: name, ok: false, from: `${facts.birthYear + 6 + rule.min}년 3월부터` };
  });
}

/** 이번 달과 다음 달 축제 메모 */
export function upcomingMonthNotes(
  months: MonthNote[],
  today: Date
): Array<{ month: number; notes: MonthNote[] }> {
  const thisMonth = today.getMonth() + 1;
  const nextMonth = (thisMonth % 12) + 1;
  return [thisMonth, nextMonth].map((month) => ({
    month,
    notes: months.filter((n) => n.months.includes(month)),
  }));
}
