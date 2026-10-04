import { BASE_PATH } from './staticMode';

/** apps/api/src/notices/notices.ts 가 만드는 notices.json 형태 */
export interface Notice {
  id: string;
  sourceId: string;
  sourceName: string;
  title: string;
  date: string;
  category: string | null;
  pinned: boolean;
  url: string;
}

export interface NoticesFile {
  generatedAt: string | null;
  sources: Array<{
    id: string;
    name: string;
    ok: boolean;
    found: number;
    errorMessage: string | null;
    listUrl: string;
  }>;
  notices: Notice[];
}

const EMPTY: NoticesFile = { generatedAt: null, sources: [], notices: [] };

export async function loadNotices(): Promise<NoticesFile> {
  try {
    const response = await fetch(`${BASE_PATH}/data/notices.json`, { cache: 'no-cache' });
    return response.ok ? ((await response.json()) as NoticesFile) : EMPTY;
  } catch {
    return EMPTY;
  }
}

export const KEYWORDS_KEY = 'withdkis.noticeKeywords';
export const LAST_VISIT_KEY = 'withdkis.noticesLastVisit';
export const DEFAULT_KEYWORDS = ['도슨트', '모집', '자원봉사', '어린이', '가족', '체험', '접수'];

export function getKeywords(): string[] {
  try {
    const raw = localStorage.getItem(KEYWORDS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed)
      ? parsed.filter((k): k is string => typeof k === 'string')
      : DEFAULT_KEYWORDS;
  } catch {
    return DEFAULT_KEYWORDS;
  }
}

export function saveKeywords(keywords: string[]): void {
  try {
    localStorage.setItem(KEYWORDS_KEY, JSON.stringify(keywords));
  } catch {
    /* 저장 못 하면 이번만 적용 */
  }
}

/** 제목에 들어 있는 키워드 (띄어쓰기 무시) */
export function matchedKeywords(title: string, keywords: string[]): string[] {
  const compact = title.replace(/\s+/g, '').toLowerCase();
  return keywords.filter((k) => k.trim() && compact.includes(k.replace(/\s+/g, '').toLowerCase()));
}

/** 제목을 키워드 부분과 나머지로 나눈다 (강조 표시용) */
export function splitByKeywords(
  title: string,
  keywords: string[]
): Array<{ text: string; hit: boolean }> {
  const words = keywords.map((k) => k.trim()).filter(Boolean);
  if (words.length === 0) return [{ text: title, hit: false }];
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(${escaped.join('|')})`, 'gi');
  return title
    .split(re)
    .filter((part) => part !== '')
    .map((part) => ({
      text: part,
      hit: words.some((w) => w.toLowerCase() === part.toLowerCase()),
    }));
}

/** 지난 방문 이후 올라온 글인지 (날짜 기준) */
export function isNewSince(notice: Notice, lastVisit: string | null): boolean {
  return Boolean(lastVisit) && notice.date > (lastVisit as string);
}
