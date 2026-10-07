/**
 * 박물관·과학관 공지사항 목록을 모아 정적 웹이 읽는 notices.json으로 쓴다.
 *
 *   npm run export:notices --workspace=apps/api -- <출력 경로>
 */
import * as fs from 'fs';
import * as path from 'path';
import { collectNotices } from '../src/notices/notices';

async function main() {
  const outPath = path.resolve(process.cwd(), process.argv[2] ?? 'notices.json');
  const result = await collectNotices();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(result));
  console.log(`공지 ${result.notices.length}건 → ${outPath}`);
  for (const s of result.sources) {
    console.log(`  ${s.ok ? '✓' : '✗'} ${s.name}: ${s.ok ? `${s.found}건` : s.errorMessage}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
