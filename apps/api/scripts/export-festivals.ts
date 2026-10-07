/**
 * 서울·근교(경기·인천) 축제 일정을 모아 정적 웹이 읽는 festivals.json으로 쓴다.
 *
 *   npm run export:festivals --workspace=apps/api -- <출력 경로>
 *
 * 키: SEOUL_OPENAPI_KEY(서울 문화행사), TOUR_API_KEY(한국관광공사, 경기·인천 포함).
 * 하나가 없거나 실패해도 나머지로 만들고, 이유는 sources에 남겨 화면에 보여준다.
 */
import * as fs from 'fs';
import * as path from 'path';
import { collectFestivals } from '../src/festivals/festivals';

async function main() {
  const outPath = path.resolve(process.cwd(), process.argv[2] ?? 'festivals.json');
  const result = await collectFestivals({
    seoul: process.env.SEOUL_OPENAPI_KEY,
    tour: process.env.TOUR_API_KEY,
  });

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(result));

  console.log(`축제 ${result.festivals.length}건 → ${outPath}`);
  for (const source of result.sources) {
    console.log(
      `  ${source.ok ? '✓' : '✗'} ${source.name}: ${source.ok ? `${source.found}건` : source.errorMessage}`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
