import { findProblems, readSources, report } from './collectionHealth';

describe('수집 결과 점검', () => {
  it('파일마다 다른 sources 모양을 맞춘다', () => {
    expect(
      readSources('programs.json', {
        sources: [{ adapterName: 'seoul', ok: true, programsFound: 1694, errorMessage: null }],
      })
    ).toEqual([{ file: 'programs.json', name: 'seoul', ok: true, found: 1694, error: null }]);
    expect(
      readSources('paid.json', {
        sources: [{ id: 'nolbal', ok: false, found: 0, errorMessage: '403' }],
      })
    ).toEqual([{ file: 'paid.json', name: 'nolbal', ok: false, found: 0, error: '403' }]);
    expect(readSources('x.json', null)).toEqual([]);
  });

  it('실패·0건·급감을 찾고 작은 흔들림은 넘긴다', () => {
    const s = (name: string, found: number, ok = true) => ({
      file: 'f.json',
      name,
      ok,
      found,
      error: ok ? null : '시간 초과',
    });
    const problems = findProblems(
      [s('a', 0, false), s('b', 0), s('c', 40), s('d', 8), s('e', 95), s('new', 0)],
      [s('a', 10), s('b', 30), s('c', 100), s('d', 15), s('e', 100)]
    );
    expect(problems.map((p) => `${p.name}:${p.message}`)).toEqual([
      'a:수집 실패: 시간 초과',
      'b:0건 (어제 30건)',
      'c:급감 100건 → 40건',
    ]);
  });

  it('보고서', () => {
    const md = report(
      [{ file: 'f.json', name: 'b', message: '0건 (어제 30건)' }],
      [{ file: 'f.json', name: 'b', ok: true, found: 0, error: null }],
      'https://example.com/run'
    );
    expect(md).toContain('| f.json | b | 0건 (어제 30건) |');
    expect(md).toContain('실행 기록: https://example.com/run');
    expect(report([], [], '')).toContain('모두 정상');
  });
});
