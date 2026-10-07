/**
 * 유료 체험(놀이의발견 + 대한민국 구석구석)을 모아 paid.json으로 쓴다.
 *
 *   npm run export:paid --workspace=apps/api -- <출력 폴더>
 *
 * 놀이의발견은 한 번에 PAID_BUDGET개(기본 500)씩만 천천히 받는다. 지난번 결과는 배포된 사이트의
 * paid-cache.json(PAID_CACHE_URL)에서 가져와 이어 받으므로, 며칠에 걸쳐 전체가 채워지고 갱신된다.
 */
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { collectPaid, type PaidCache } from '../src/paid/paid';

async function loadPreviousCache(url: string | undefined): Promise<PaidCache | null> {
  if (!url) return null;
  try {
    const { data } = await axios.get(url, { timeout: 30000 });
    return data && typeof data === 'object' && data.nolbal ? (data as PaidCache) : null;
  } catch {
    return null; // 처음 배포라 없을 수 있다
  }
}

async function main() {
  const outDir = path.resolve(process.cwd(), process.argv[2] ?? '.');
  const previousCache = await loadPreviousCache(process.env.PAID_CACHE_URL);
  const { file, cache } = await collectPaid({
    previousCache,
    tourKey: process.env.TOUR_API_KEY,
    budget: Number(process.env.PAID_BUDGET) || 500,
    delayMs: Number(process.env.PAID_DELAY_MS) || 700,
  });

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'paid.json'), JSON.stringify(file));
  fs.writeFileSync(path.join(outDir, 'paid-cache.json'), JSON.stringify(cache));
  console.log(
    `유료 체험 ${file.items.length}건 (지난 캐시 ${previousCache ? Object.keys(previousCache.nolbal).length : 0}개)`
  );
  for (const s of file.sources) {
    console.log(
      `  ${s.ok ? '✓' : '✗'} ${s.name}: ${s.ok ? (s.note ?? `${s.found}건`) : s.errorMessage}`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
