import axios from 'axios';
import { decodeHtml } from '../crawler/adapters/seoul-public-service.adapter';

/**
 * 박물관·과학관 홈페이지 공지사항 목록을 모아 notices.json으로 만든다.
 * 도슨트·교육 모집처럼 공공예약에 안 올라오는 소식을 놓치지 않으려는 용도.
 *
 * 대부분의 공공기관 게시판은 <table>의 한 줄(<tr>)에 제목 링크와 날짜가 있어 같은 방법으로 읽는다.
 * 기관을 늘리려면 NOTICE_SOURCES에 목록 주소만 추가하면 된다.
 */

export interface NoticeSource {
  id: string;
  name: string;
  /** 목록 주소. {page}가 있으면 여러 쪽을 읽는다 */
  listUrl: string;
  pages?: number;
}

export const NOTICE_SOURCES: NoticeSource[] = [
  {
    id: 'sdm-natural-history',
    name: '서대문자연사박물관',
    listUrl: 'https://namu.sdm.go.kr/web/main/bbs/newsevent_news_notice/list?cp={page}',
    pages: 2,
  },
  {
    id: 'seoul-science-center',
    name: '서울시립과학관',
    listUrl: 'https://science.seoul.go.kr/board/normal?menuId=21&bbsId=1',
  },
];

export interface Notice {
  id: string;
  sourceId: string;
  sourceName: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  category: string | null;
  /** 상단 고정 공지 */
  pinned: boolean;
  /** 글 주소. 게시판이 자바스크립트로만 열리면 목록 주소 */
  url: string;
}

export interface NoticesFile {
  generatedAt: string;
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

const text = (html: string) =>
  decodeHtml(html.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();

const DATE = /(20\d{2})[.\-/]\s?(\d{1,2})[.\-/]\s?(\d{1,2})/;

/** 게시판 목록 HTML에서 글(제목·날짜·주소)을 뽑는다 */
export function parseBoard(
  html: string,
  listUrl: string,
  source: Pick<NoticeSource, 'id' | 'name'>
): Notice[] {
  const notices: Notice[] = [];
  const rows = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  for (const row of rows) {
    const link = row.match(/<a\b([^>]*)>([\s\S]*?)<\/a>/i);
    const cells = (row.match(/<td\b[^>]*>[\s\S]*?<\/td>/gi) ?? []).map(text);
    const dateMatch = cells.map((c) => c.match(DATE)).find(Boolean);
    if (!link || !dateMatch) continue;

    const title = text(link[2])
      .replace(/\s*new$/i, '')
      .trim();
    if (!title) continue;
    const date = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
    const href = link[1].match(/href\s*=\s*["']([^"']*)["']/i)?.[1] ?? '';
    const seq = link[1].match(/data-(?:seq|id|idx)\s*=\s*["']([^"']+)["']/i)?.[1];
    const url =
      href && !/^(javascript:|#)/i.test(href)
        ? new URL(decodeHtml(href), listUrl).toString()
        : listUrl;

    const first = cells[0] ?? '';
    const pinned = /top|notice|fix/i.test(row.slice(0, row.indexOf('>'))) || /^공지$/.test(first);
    // 번호·날짜·제목·조회수가 아닌 짧은 칸을 분류로 본다 (예: 교육, 행사)
    const category =
      cells.find(
        (c) =>
          c && c !== title && c.length <= 8 && !/^\d+$/.test(c) && !DATE.test(c) && c !== '공지'
      ) ?? null;

    const key = seq ?? url.replace(/[?&](cp|page|pageIndex)=\d+/g, '');
    notices.push({
      id: `${source.id}-${key}-${title}`.replace(/[^\p{L}\p{N}_-]/gu, '_').slice(0, 120),
      sourceId: source.id,
      sourceName: source.name,
      title,
      date,
      category,
      pinned,
      url,
    });
  }
  return notices;
}

type HttpGet = (url: string) => Promise<string>;

const defaultGet: HttpGet = async (url) =>
  (
    await axios.get<string>(url, {
      timeout: 60000,
      responseType: 'text',
      headers: { 'User-Agent': 'Mozilla/5.0 (WITHKIDS notice watcher)' },
    })
  ).data;

export async function collectNotices(
  sources: NoticeSource[] = NOTICE_SOURCES,
  now: Date = new Date(),
  get: HttpGet = defaultGet
): Promise<NoticesFile> {
  const result: NoticesFile = { generatedAt: now.toISOString(), sources: [], notices: [] };
  const seen = new Set<string>();

  for (const source of sources) {
    const firstUrl = source.listUrl.replace('{page}', '1');
    try {
      let found = 0;
      for (
        let page = 1;
        page <= (source.listUrl.includes('{page}') ? (source.pages ?? 1) : 1);
        page++
      ) {
        const url = source.listUrl.replace('{page}', String(page));
        const parsed = parseBoard(await get(url), url, source);
        for (const notice of parsed) {
          // 고정 공지는 쪽마다 반복되므로 한 번만
          if (seen.has(notice.id)) continue;
          seen.add(notice.id);
          result.notices.push(notice);
          found++;
        }
      }
      if (found === 0)
        throw new Error('게시판에서 글을 찾지 못했습니다 (홈페이지 구조가 바뀌었을 수 있어요)');
      result.sources.push({
        id: source.id,
        name: source.name,
        ok: true,
        found,
        errorMessage: null,
        listUrl: firstUrl,
      });
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response
          ? `HTTP ${error.response.status}`
          : `홈페이지에 연결하지 못했습니다 (${error.message})`
        : error instanceof Error
          ? error.message
          : String(error);
      result.sources.push({
        id: source.id,
        name: source.name,
        ok: false,
        found: 0,
        errorMessage: message,
        listUrl: firstUrl,
      });
    }
  }

  result.notices.sort(
    (a, b) => b.date.localeCompare(a.date) || Number(b.pinned) - Number(a.pinned)
  );
  return result;
}
