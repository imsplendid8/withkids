import { isNewSince, matchedKeywords, splitByKeywords, type Notice } from '../notices';

const notice = (title: string, date = '2026-10-02'): Notice => ({
  id: 'x',
  sourceId: 's',
  sourceName: '서대문자연사박물관',
  title,
  date,
  category: null,
  pinned: false,
  url: 'https://example.org',
});

describe('notices', () => {
  it('제목에서 키워드를 찾는다 (띄어쓰기 무시)', () => {
    expect(
      matchedKeywords('【어린이도슨트】 도슨트 활동 위치 안내', ['도슨트', '모집', '어린이'])
    ).toEqual(['도슨트', '어린이']);
    expect(matchedKeywords('자원 봉사자 모집', ['자원봉사'])).toEqual(['자원봉사']);
    expect(matchedKeywords('휴관일 안내', ['도슨트'])).toEqual([]);
  });

  it('강조 표시용으로 제목을 나눈다', () => {
    expect(splitByKeywords('어린이 도슨트 모집', ['도슨트'])).toEqual([
      { text: '어린이 ', hit: false },
      { text: '도슨트', hit: true },
      { text: ' 모집', hit: false },
    ]);
    expect(splitByKeywords('휴관 (안내)', ['(안내)'])).toEqual([
      { text: '휴관 ', hit: false },
      { text: '(안내)', hit: true },
    ]);
  });

  it('지난 방문 이후 글만 새 글', () => {
    expect(isNewSince(notice('a', '2026-10-02'), '2026-10-01')).toBe(true);
    expect(isNewSince(notice('a', '2026-10-01'), '2026-10-01')).toBe(false);
    expect(isNewSince(notice('a'), null)).toBe(false);
  });
});
