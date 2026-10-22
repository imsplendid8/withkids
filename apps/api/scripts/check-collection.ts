/**
 * 수집 결과 점검. GitHub Actions에서 수집 직후 돌린다.
 *   ts-node scripts/check-collection.ts <data 폴더> <배포된 사이트 주소> <결과 md 파일>
 * 문제가 있으면 종료 코드 0으로 끝나되 결과 파일 첫 줄에 PROBLEMS 를 적는다 (배포는 막지 않는다).
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import axios from 'axios';
import { findProblems, readSources, report, type SourceStat } from '../src/health/collectionHealth';

const FILES = ['programs.json', 'festivals.json', 'notices.json', 'paid.json'];

async function main() {
  const [dir, siteUrl, out] = process.argv.slice(2);
  if (!dir || !out)
    throw new Error('사용법: check-collection.ts <data 폴더> <사이트 주소> <결과 파일>');

  const current: SourceStat[] = [];
  const previous: SourceStat[] = [];
  for (const file of FILES) {
    const path = join(dir, file);
    if (existsSync(path))
      current.push(...readSources(file, JSON.parse(readFileSync(path, 'utf8'))));
    else current.push({ file, name: '파일', ok: false, found: 0, error: '파일이 만들어지지 않음' });
    if (siteUrl) {
      try {
        const { data } = await axios.get(`${siteUrl}/data/${file}`, { timeout: 60000 });
        previous.push(...readSources(file, data));
      } catch {
        // 첫 배포이거나 사이트가 잠시 안 열리면 어제 값 없이 실패만 본다
      }
    }
  }

  const problems = findProblems(current, previous);
  const runUrl = process.env.RUN_URL ?? '';
  writeFileSync(
    out,
    `${problems.length ? 'PROBLEMS' : 'OK'}\n${report(problems, current, runUrl)}\n`
  );
  console.log(problems.length ? `문제 ${problems.length}건` : '정상');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
