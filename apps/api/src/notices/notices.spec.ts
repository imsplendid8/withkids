import * as fs from 'fs';
import * as path from 'path';
import { collectNotices, parseBoard } from './notices';

// 실제 게시판 목록 HTML(표 부분)을 저장해 둔 것
const fixture = (name: string) =>
  fs.readFileSync(path.join(__dirname, '__fixtures__', name), 'utf8');
const SDM = { id: 'sdm', name: '서대문자연사박물관' };
const SDM_URL = 'https://namu.sdm.go.kr/web/main/bbs/newsevent_news_notice/list?cp=1';

describe('parseBoard', () => {
  it('서대문자연사박물관 공지 목록', () => {
    const notices = parseBoard(fixture('sdm-list.html'), SDM_URL, SDM);
    expect(notices.length).toBeGreaterThanOrEqual(15);
    const docent = notices.find((n) => n.title.includes('어린이도슨트'));
    expect(docent).toMatchObject({
      date: '2026-01-14',
      category: '박물관 운영',
      pinned: true,
      sourceName: '서대문자연사박물관',
    });
    expect(docent?.url).toMatch(
      /^https:\/\/namu\.sdm\.go\.kr\/web\/main\/bbs\/newsevent_news_notice\/60292/
    );
    // "new" 표시는 제목에서 뺀다
    expect(notices.some((n) => /new$/.test(n.title))).toBe(false);
    expect(notices.find((n) => n.title.startsWith('2026년 10월 박물관 휴관일'))?.pinned).toBe(
      false
    );
  });

  it('자바스크립트로 열리는 게시판은 목록 주소로 연결', () => {
    const url = 'https://science.seoul.go.kr/board/normal?menuId=21&bbsId=1';
    const notices = parseBoard(fixture('science-list.html'), url, {
      id: 'sci',
      name: '서울시립과학관',
    });
    expect(notices.length).toBeGreaterThanOrEqual(5);
    expect(notices[0].url).toBe(url);
    expect(notices[0].date).toMatch(/^2026-\d\d-\d\d$/);
  });
});

describe('collectNotices', () => {
  it('여러 쪽을 읽고 고정 공지는 한 번만, 실패한 곳은 이유를 남긴다', async () => {
    const get = jest.fn(async (url: string) => {
      if (url.includes('broken')) throw new Error('boom');
      return fixture('sdm-list.html');
    });
    const result = await collectNotices(
      [
        { id: 'sdm', name: '서대문', listUrl: 'https://namu.sdm.go.kr/list?cp={page}', pages: 2 },
        { id: 'x', name: '고장난 곳', listUrl: 'https://broken.example/list' },
      ],
      new Date('2026-10-04T00:00:00Z'),
      get
    );
    expect(get).toHaveBeenCalledTimes(3);
    const once = parseBoard(fixture('sdm-list.html'), 'https://namu.sdm.go.kr/list?cp=1', {
      id: 'sdm',
      name: '서대문',
    });
    expect(result.notices).toHaveLength(once.length);
    expect(result.sources).toEqual([
      expect.objectContaining({ id: 'sdm', ok: true }),
      expect.objectContaining({ id: 'x', ok: false, errorMessage: 'boom' }),
    ]);
    // 최신 글이 먼저
    expect(result.notices[0].date >= result.notices[result.notices.length - 1].date).toBe(true);
  });
});
