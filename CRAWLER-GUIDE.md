# Crawler & Adapter 개발 가이드

## 🕷️ Crawler 시스템 개요

WithDKIS의 Crawler는 다양한 웹사이트에서 체험 프로그램 정보를 자동으로 수집합니다.

**핵심 구조**:
- **Adapter**: 사이트별 크롤러 (e.g., SeoulPublicServiceAdapter)
- **CrawlerService**: 모든 Adapter를 조정
- **Adapter Interface**: 표준화된 계약

---

## 📋 Adapter Interface

```typescript
interface Adapter {
  metadata: AdapterMetadata;
  fetchPrograms(): Promise<ExperienceData[]>;
  fetchProgramUpdates?(
    lastCrawlAt: Date,
    previousPrograms: ExperienceData[],
  ): Promise<CrawlResult>;
}
```

### AdapterMetadata
```typescript
{
  name: 'seoul-public-service',           // 고유 이름
  baseUrl: 'https://...',                 // 대상 사이트
  schedule: CrawlSchedule.DAILY,          // 크롤 주기
  enabled: true,                          // 활성화 여부
  automationInfo: {
    isAutomatable: true,
    blockers: [],                         // CAPTCHA, 대기열 등
    notes: 'No CAPTCHA detected'
  }
}
```

### ExperienceData
```typescript
{
  externalId: 'seoul-001',                // 외부 사이트의 고유 ID
  institutionName: '서울시청',
  programName: '어린이 시정투어',
  description: '시청 건물을 둘러보는 프로그램',
  programUrl: 'https://...',
  bookingUrl: 'https://...',
  experienceDate: Date,                   // 체험 날짜
  bookingOpenAt: Date,                    // 신청 시작 시간
  bookingCloseAt: Date,                   // 신청 종료 시간
  capacity: 30,
  price: 0,
  ageGroup: '6-12',
  bookingMethod: 'FIRST_COME' | 'LOTTERY' | 'ALWAYS_AVAILABLE',
  status: 'OPENING_SOON' | 'OPEN' | 'CLOSED' | 'UNKNOWN',
  externalSource: 'seoul-public-service'
}
```

---

## 🛠️ Adapter 작성 예제

### Mock Adapter (현재)
실제 예시: `apps/api/src/crawler/adapters/seoul-public-service.adapter.ts` (아래 MockAdapter 코드는 구조 설명용)

테스트 데이터를 반환하는 기본 adapter입니다.

### 실제 Adapter 작성 예

```typescript
// apps/api/src/crawler/adapters/seoul-public-service.adapter.ts

import { Injectable } from '@nestjs/common';
import { Adapter, AdapterMetadata, ExperienceData, CrawlSchedule } from '../adapter.interface';

@Injectable()
export class SeoulPublicServiceAdapter implements Adapter {
  metadata: AdapterMetadata = {
    name: 'seoul-public-service',
    baseUrl: 'https://www.seoul.go.kr/main/index.jsp',
    schedule: CrawlSchedule.DAILY,
    enabled: false, // 개발 중
    automationInfo: {
      isAutomatable: false,
      blockers: ['JAVASCRIPT_RENDERING'],
      notes: 'Requires JavaScript rendering',
    },
  };

  async fetchPrograms(): Promise<ExperienceData[]> {
    // 1. 웹사이트 방문
    const programs: ExperienceData[] = [];

    try {
      // 2. HTML 파싱 또는 API 호출
      // const response = await fetch(this.metadata.baseUrl);
      // const html = await response.text();
      
      // 3. 데이터 추출
      // const $ = cheerio.load(html);
      
      // 4. 정규화
      // programs.push({
      //   externalId: ...,
      //   institutionName: ...,
      //   ...
      // });

      return programs;
    } catch (error) {
      console.error(`Error fetching from ${this.metadata.name}:`, error);
      throw error;
    }
  }

  async fetchProgramUpdates(lastCrawlAt: Date, previousPrograms: ExperienceData[]) {
    const programs = await this.fetchPrograms();
    const previousIds = previousPrograms.map((p) => p.externalId);
    const newPrograms = programs.filter((p) => !previousIds.includes(p.externalId));

    return {
      adapterName: this.metadata.name,
      success: true,
      programs,
      newCount: newPrograms.length,
      updatedCount: programs.length - newPrograms.length,
      crawledAt: new Date(),
    };
  }
}
```

---

## 📦 HTML 스크래핑 (Cheerio)

### 설치
```bash
cd apps/api
npm install cheerio
```

### 예제
```typescript
import * as cheerio from 'cheerio';

async function scrapeExample() {
  const response = await fetch('https://example.com');
  const html = await response.text();
  const $ = cheerio.load(html);

  // CSS 선택자로 요소 선택
  const titles = $('h2.program-title').map((i, el) => {
    return $(el).text();
  }).get();

  return titles;
}
```

---

## 🔄 Adapter 등록

### CrawlerModule에 추가

```typescript
// apps/api/src/crawler/crawler.module.ts

import { Module } from '@nestjs/common';
import { CrawlerService } from './crawler.service';
import { MockAdapter } from './adapters/mock.adapter';
import { SeoulPublicServiceAdapter } from './adapters/seoul-public-service.adapter';

@Module({
  providers: [
    CrawlerService,
    MockAdapter,
    SeoulPublicServiceAdapter,  // 추가
  ],
  exports: [CrawlerService],
})
export class CrawlerModule {}
```

### CrawlerService 생성자 수정

```typescript
constructor(
  mockAdapter: MockAdapter,
  seoulPublicServiceAdapter: SeoulPublicServiceAdapter,
) {
  this.registerAdapter(mockAdapter);
  this.registerAdapter(seoulPublicServiceAdapter);
}
```

---

## 🧪 Adapter 테스트

### 단위 테스트

```typescript
// apps/api/src/crawler/adapters/mock.adapter.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { MockAdapter } from './mock.adapter';

describe('MockAdapter', () => {
  let adapter: MockAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MockAdapter],
    }).compile();

    adapter = module.get<MockAdapter>(MockAdapter);
  });

  it('should fetch programs', async () => {
    const programs = await adapter.fetchPrograms();
    
    expect(programs).toBeDefined();
    expect(programs.length).toBeGreaterThan(0);
    expect(programs[0].externalId).toBeDefined();
  });

  it('should have valid metadata', () => {
    expect(adapter.metadata.name).toBe('mock');
    expect(adapter.metadata.schedule).toBeDefined();
  });
});
```

---

## 🔍 Adapter 주의사항

### Rate Limiting
```typescript
// 사이트별 크롤 delay 설정
const CRAWL_DELAYS = {
  'seoul-public-service': 2000,  // 2초
  'museum': 1000,                // 1초
};

await delay(CRAWL_DELAYS[adapterName]);
```

### User-Agent 설정
```typescript
const headers = {
  'User-Agent': 'WithDKIS/1.0 (+https://github.com/imsplendid8/game-app)',
};
const response = await fetch(url, { headers });
```

### Error Handling
```typescript
try {
  const programs = await adapter.fetchPrograms();
  return programs;
} catch (error) {
  logger.error(`Adapter ${adapter.metadata.name} failed:`, error);
  return [];
}
```

### robots.txt 준수
```typescript
// 항상 robots.txt 확인
const robotsUrl = `${baseUrl}/robots.txt`;
const robots = await fetch(robotsUrl);
// Disallow 규칙 확인 후 크롤링
```

---

## 📊 데이터 검증

### ExperienceData 검증
```typescript
function validateExperienceData(data: ExperienceData): boolean {
  return (
    !!data.externalId &&
    !!data.institutionName &&
    !!data.programName &&
    !!data.externalSource &&
    typeof data.capacity === 'number' &&
    typeof data.price === 'number'
  );
}
```

---

## 🚀 Phase 2 Adapter 계획

| Adapter | Priority | Status | Est. Date |
|---------|----------|--------|-----------|
| Seoul Public Service | HIGH | 🔄 | Week 3 |
| Museums | HIGH | ⏳ | Week 4 |
| Science Centers | MEDIUM | ⏳ | Week 4 |
| Factory Tours | MEDIUM | ⏳ | Week 5 |
| Broadcasting | LOW | ⏳ | Week 6 |

---

## 📝 주의사항

1. **자동화 금지**: CAPTCHA나 대기열이 있으면 수동 신청으로 표시
2. **TOS 준수**: 각 사이트의 이용약관 확인
3. **Error Handling**: 네트워크 오류, 타임아웃 처리
4. **Logging**: 모든 크롤 활동 기록
5. **Cache**: 불필요한 중복 요청 방지

