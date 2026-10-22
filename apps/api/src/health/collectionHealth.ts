/**
 * 매일 수집 결과 점검: 실패했거나, 0건이 됐거나, 어제보다 크게 줄었으면 알린다.
 * 원천 사이트 구조가 바뀌면 오류 없이 0건이 오는 경우가 있어(예: 관광공사 축제) 건수도 본다.
 */

export interface SourceStat {
  file: string;
  name: string;
  ok: boolean;
  found: number;
  error: string | null;
}

/** 파일마다 sources 모양이 조금씩 달라서 하나로 맞춘다 */
export function readSources(file: string, data: unknown): SourceStat[] {
  const sources = (data as { sources?: unknown[] } | null)?.sources;
  if (!Array.isArray(sources)) return [];
  return sources.map((raw) => {
    const s = raw as Record<string, unknown>;
    const found = [s.found, s.programsFound].find((v) => typeof v === 'number') as
      number | undefined;
    return {
      file,
      name: String(s.id ?? s.name ?? s.adapterName ?? 'unknown'),
      ok: s.ok !== false,
      found: found ?? 0,
      error: typeof s.errorMessage === 'string' ? s.errorMessage : null,
    };
  });
}

export interface Problem {
  file: string;
  name: string;
  message: string;
}

/** 어제보다 이 비율 아래로 줄면 이상으로 본다 (작은 목록은 흔들림이 커서 건수가 충분할 때만) */
const DROP_RATIO = 0.5;
const MIN_PREVIOUS_FOR_DROP = 20;

export function findProblems(current: SourceStat[], previous: SourceStat[]): Problem[] {
  const before = new Map(previous.map((s) => [`${s.file}|${s.name}`, s.found]));
  const problems: Problem[] = [];
  for (const s of current) {
    const prev = before.get(`${s.file}|${s.name}`);
    if (!s.ok) {
      problems.push({
        file: s.file,
        name: s.name,
        message: `수집 실패: ${s.error ?? '이유 없음'}`,
      });
    } else if (s.found === 0 && (prev ?? 0) > 0) {
      problems.push({ file: s.file, name: s.name, message: `0건 (어제 ${prev}건)` });
    } else if (prev !== undefined && prev >= MIN_PREVIOUS_FOR_DROP && s.found < prev * DROP_RATIO) {
      problems.push({ file: s.file, name: s.name, message: `급감 ${prev}건 → ${s.found}건` });
    }
  }
  return problems;
}

export function report(problems: Problem[], current: SourceStat[], runUrl: string): string {
  const lines = problems.length
    ? [
        '오늘 데이터 수집에서 확인이 필요한 곳이 있어요.',
        '',
        '| 파일 | 출처 | 내용 |',
        '| --- | --- | --- |',
      ]
    : ['오늘 수집은 모두 정상이에요.', ''];
  for (const p of problems)
    lines.push(`| ${p.file} | ${p.name} | ${p.message.replace(/\|/g, '/')} |`);
  lines.push('', '<details><summary>전체 건수</summary>', '');
  for (const s of current) lines.push(`- ${s.file} · ${s.name}: ${s.ok ? `${s.found}건` : '실패'}`);
  lines.push('', '</details>');
  if (runUrl) lines.push('', `실행 기록: ${runUrl}`);
  return lines.join('\n');
}
