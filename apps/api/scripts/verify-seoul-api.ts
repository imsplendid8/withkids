/**
 * 서울 열린데이터광장 공공서비스예약 API 연결 검증 스크립트.
 *
 *   npm run crawler:verify --workspace=apps/api
 *
 * apps/api/.env의 SEOUL_OPENAPI_KEY를 읽는다. 키가 없으면 서울 오픈API가
 * 제공하는 테스트용 'sample' 키로 시도하므로, 키를 발급받기 전에도 응답
 * 형태와 매핑이 맞는지 확인할 수 있다.
 *
 * 하는 일:
 *   1. 실제 API를 호출해 응답이 오는지 확인
 *   2. 받은 행의 실제 필드명을 어댑터가 기대하는 필드와 대조
 *   3. 어댑터의 매핑을 그대로 돌려 결과 한 건을 보여줌
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
import axios from 'axios';
import {
  SeoulPublicServiceAdapter,
  SEOUL_SERVICES,
  SEOUL_ROW_FIELDS,
  SEOUL_REQUIRED_FIELDS,
  SEOUL_BASE_URL,
} from '../src/crawler/adapters/seoul-public-service.adapter';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE_URL = process.env.SEOUL_OPENAPI_BASE_URL || SEOUL_BASE_URL;
const SAMPLE_KEY = 'sample';

const line = (char = '─') => console.log(char.repeat(64));

async function inspectService(apiKey: string, service: string) {
  console.log(`\n▶ ${service}`);

  const url = `${BASE_URL}/${apiKey}/json/${service}/1/5/`;
  let data: Record<string, any>;

  try {
    const response = await axios.get(url, { timeout: 15000 });
    data = response.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`  ✗ 호출 실패: ${message}`);
    console.log(
      '    네트워크 차단, 방화벽, 또는 8088 포트 차단일 수 있습니다.',
    );
    return false;
  }

  // 인증키 오류·호출한도 초과는 서비스 키 없이 RESULT만 돌아온다.
  const body = data?.[service];
  if (!body) {
    const result = data?.RESULT ?? data;
    console.log(`  ✗ 서비스 응답이 없습니다: ${JSON.stringify(result).slice(0, 300)}`);
    if (JSON.stringify(result).includes('인증')) {
      console.log('    → 인증키를 확인하세요. https://data.seoul.go.kr > 인증키 신청');
    }
    return false;
  }

  const code = body.RESULT?.CODE ?? '?';
  const message = body.RESULT?.MESSAGE ?? '';
  console.log(`  응답 코드: ${code} ${message}`);
  console.log(`  전체 건수(list_total_count): ${body.list_total_count ?? '없음'}`);

  const rows: Record<string, unknown>[] = body.row ?? [];
  if (rows.length === 0) {
    console.log('  ✗ row가 비어 있습니다.');
    return false;
  }
  console.log(`  받은 행: ${rows.length}건`);

  // 실제 필드명 대조
  const actual = Object.keys(rows[0]);
  const missing = SEOUL_ROW_FIELDS.filter((f) => !actual.includes(f));
  const missingRequired = SEOUL_REQUIRED_FIELDS.filter(
    (f) => !actual.includes(f),
  );

  console.log(`\n  실제 응답 필드 (${actual.length}개):`);
  console.log(`    ${actual.join(', ')}`);

  if (missing.length === 0) {
    console.log('\n  ✓ 어댑터가 기대하는 필드가 모두 있습니다.');
  } else {
    const mark = missingRequired.length > 0 ? '✗' : '⚠';
    console.log(`\n  ${mark} 응답에 없는 필드: ${missing.join(', ')}`);
    if (missingRequired.length > 0) {
      console.log(
        `    필수 필드(${missingRequired.join(', ')})가 없어 매핑이 0건이 됩니다.`,
      );
      console.log('    위 "실제 응답 필드" 목록을 그대로 알려주시면 매핑을 맞추겠습니다.');
    } else {
      console.log('    선택 필드라 매핑은 되지만 해당 값이 비어 있게 됩니다.');
    }
  }

  console.log('\n  응답 첫 행 원본:');
  console.log(
    JSON.stringify(rows[0], null, 2)
      .split('\n')
      .map((l) => `    ${l}`)
      .join('\n'),
  );

  return missingRequired.length === 0;
}

async function main() {
  const configuredKey = process.env.SEOUL_OPENAPI_KEY?.trim();
  const apiKey = configuredKey || SAMPLE_KEY;

  line('═');
  console.log('서울 열린데이터광장 공공서비스예약 API 검증');
  line('═');

  if (configuredKey) {
    console.log(`인증키: .env의 SEOUL_OPENAPI_KEY 사용 (${configuredKey.slice(0, 4)}…)`);
  } else {
    console.log('인증키: .env에 SEOUL_OPENAPI_KEY가 없어 테스트용 sample 키로 시도합니다.');
    console.log('        (sample 키는 소수의 행만 돌려주며, 실제 수집에는 발급키가 필요합니다)');
  }

  const outcomes: boolean[] = [];
  for (const service of SEOUL_SERVICES) {
    outcomes.push(await inspectService(apiKey, service));
  }
  const allOk = outcomes.every(Boolean);

  if (!outcomes.some(Boolean)) {
    line('═');
    console.log('✗ 어느 서비스도 응답하지 않아 매핑 확인을 건너뜁니다.');
    console.log('  위 출력을 그대로 공유해 주세요.');
    line('═');
    process.exitCode = 1;
    return;
  }

  // 어댑터 매핑을 실제로 돌려본다.
  line();
  console.log('\n▶ 어댑터 매핑 결과');
  process.env.SEOUL_OPENAPI_KEY = apiKey;
  let programs: Awaited<ReturnType<SeoulPublicServiceAdapter['fetchPrograms']>> = [];
  try {
    programs = await new SeoulPublicServiceAdapter().fetchPrograms();
  } catch (error) {
    console.log(`  ✗ ${error instanceof Error ? error.message : String(error)}`);
  }
  console.log(`  매핑된 프로그램: ${programs.length}건`);
  if (programs.length > 0) {
    console.log('\n  매핑 예시 1건:');
    console.log(
      JSON.stringify(programs[0], null, 2)
        .split('\n')
        .map((l) => `    ${l}`)
        .join('\n'),
    );
  }

  line('═');
  if (allOk && programs.length > 0) {
    console.log('✓ 연결과 매핑이 정상입니다.');
    if (!configuredKey) {
      console.log('  이제 발급받은 키를 .env의 SEOUL_OPENAPI_KEY에 넣으면 전체 수집이 됩니다.');
    } else {
      console.log('  API를 재시작하고 POST /api/jobs/crawler/trigger 를 호출하면 DB에 저장됩니다.');
    }
  } else {
    console.log('✗ 확인이 필요합니다. 위 출력을 그대로 공유해 주세요.');
    process.exitCode = 1;
  }
  line('═');
}

main().catch((error) => {
  console.error('검증 스크립트 오류:', error);
  process.exitCode = 1;
});
