# WithDKIS Crawler System Guide

## 📋 개요

WithDKIS의 Crawler 시스템은 다양한 웹사이트에서 어린이 체험 프로그램 정보를 자동으로 수집합니다.

### 지원하는 Adapter 목록

| Adapter | 상태 | 설명 |
|---------|------|------|
| **mock** | ✅ 활성 | 개발용 다양한 테스트 데이터 생성 |
| **data-loader** | ✅ 활성 | JSON 파일에서 프로그램 데이터 import |
| **seoul-public-service** | 🔄 준비중 | 서울시 공공서비스 프로그램 (API 필요) |
| **museum** | 🔄 준비중 | 박물관 프로그램 (개별 연동 필요) |
| **science-center** | 🔄 준비중 | 과학관 프로그램 (개별 연동 필요) |
| **factory-tour** | 🔄 준비중 | 공장 투어 프로그램 |
| **broadcasting** | 🔄 준비중 | 방송국 스튜디오 투어 |

---

## 🚀 빠른 시작

### 1. Mock Adapter로 테스트 데이터 사용

가장 간단한 방법입니다. Mock adapter는 기본적으로 활성화되어 있고 다양한 테스트 데이터를 자동으로 생성합니다.

```bash
# API 서버 시작
npm run dev:api

# 크롤러 실행 (HTTP 요청)
curl http://localhost:3001/api/crawler/crawl

# 특정 adapter로만 크롤링
curl http://localhost:3001/api/crawler/crawl/mock
```

### 2. JSON 파일에서 데이터 Import

`data-loader` adapter를 사용하면 JSON 파일의 프로그램 데이터를 자동으로 수집합니다.

#### 단계 1: 데이터 파일 작성

`apps/api/src/crawler/data/` 디렉토리에 JSON 파일을 생성합니다.

**파일명**: `my-programs.json`

```json
[
  {
    "externalId": "mydata-001",
    "institutionName": "내 기관",
    "programName": "프로그램 이름",
    "description": "프로그램 설명",
    "programUrl": "https://...",
    "bookingUrl": "https://...",
    "experienceDate": "2025-10-20",
    "bookingOpenAt": "2025-09-15T09:00:00Z",
    "bookingCloseAt": "2025-10-19T17:00:00Z",
    "capacity": 30,
    "price": 5000,
    "ageGroup": "6-12",
    "bookingMethod": "FIRST_COME",
    "status": "OPENING_SOON",
    "externalSource": "my-source"
  }
]
```

#### 단계 2: 데이터 로드

```bash
# 모든 크롤러 실행 (data-loader 포함)
curl http://localhost:3001/api/crawler/crawl

# data-loader만 실행
curl http://localhost:3001/api/crawler/crawl/data-loader
```

#### 단계 3: 결과 확인

```bash
# 수집된 프로그램 확인
curl http://localhost:3001/api/programs
```

---

## 📝 데이터 형식

### ExperienceData 객체

```typescript
{
  // 필수 필드
  externalId: string;              // 외부 시스템의 고유 ID
  institutionName: string;         // 기관/단체명
  programName: string;             // 프로그램명
  bookingMethod: 'FIRST_COME' | 'LOTTERY' | 'ALWAYS_AVAILABLE';
  status: 'OPENING_SOON' | 'OPEN' | 'CLOSED' | 'UNKNOWN';
  
  // 선택 필드
  description?: string;            // 프로그램 설명
  programUrl?: string;             // 프로그램 상세 페이지 URL
  bookingUrl?: string;             // 예약 페이지 URL
  experienceDate?: Date;           // 체험 날짜
  bookingOpenAt?: Date;            // 예약 시작 시간
  bookingCloseAt?: Date;           // 예약 종료 시간
  capacity?: number;               // 정원
  price?: number;                  // 가격 (원)
  ageGroup?: string;               // 대상 연령 (예: "6-12")
  externalSource: string;          // 데이터 출처
}
```

### 날짜 형식

ISO 8601 형식을 사용합니다:
- `"2025-10-20"` (날짜만)
- `"2025-10-20T09:00:00Z"` (날짜 + 시간, UTC)

### 예약 방법 (bookingMethod)

- `FIRST_COME`: 선착순
- `LOTTERY`: 추첨
- `ALWAYS_AVAILABLE`: 상시 가능

### 프로그램 상태 (status)

- `OPENING_SOON`: 곧 시작 (예약 개시 전)
- `OPEN`: 예약 중
- `CLOSED`: 예약 종료
- `UNKNOWN`: 상태 미확인

---

## 🔌 실제 웹사이트에서 데이터 수집하기

### 방법 1: 공개 API 활용

많은 정부 기관과 공공 서비스에서 OpenAPI를 제공합니다.

#### 예: 서울 열린데이터광장 공공서비스예약 API

구현: `apps/api/src/crawler/adapters/seoul-public-service.adapter.ts`

두 개의 서비스를 조회한다.
- `ListPublicReservationEducation` (교육체험)
- `ListPublicReservationCulture` (문화행사)

요청 형식은 경로에 인증키를 넣는 방식이다.

```
GET http://openapi.seoul.go.kr:8088/{KEY}/json/{SERVICE}/{시작}/{끝}/
```

응답은 서비스명을 키로 갖는다.

```json
{
  "ListPublicReservationEducation": {
    "list_total_count": 1234,
    "RESULT": { "CODE": "INFO-000", "MESSAGE": "정상 처리되었습니다" },
    "row": [{ "SVCID": "...", "SVCNM": "...", "PLACENM": "...", "SVCSTATNM": "접수중" }]
  }
}
```

`list_total_count`를 보고 1000건 단위로 끝까지 페이지를 넘긴다.

**설정**:
1. https://data.seoul.go.kr 로그인 > "인증키 신청" > 일반 인증키 (무료, 즉시 발급)
2. `.env` 파일에 추가:
   ```env
   SEOUL_OPENAPI_KEY=발급받은-키
   ```
3. 키가 비어 있으면 어댑터는 경고만 남기고 건너뛴다. 별도 활성화 작업은 필요 없다.

**연결 확인**

```bash
npm run crawler:verify --workspace=apps/api
```

실제 API를 호출해서 (1) 응답이 오는지, (2) 받은 행의 실제 필드명이 어댑터가
기대하는 필드와 맞는지, (3) 매핑 결과 한 건을 출력한다. 키가 없으면 서울
오픈API의 테스트용 `sample` 키로 시도하므로 발급 전에도 확인할 수 있다.

필드명이 달라 매핑이 0건이 되면 스크립트가 실제 필드 목록을 그대로 찍어준다.
크롤 중에도 같은 상황이면 경고 로그에 필드명을 남긴다.

### 방법 2: 웹 스크래핑

HTML 파싱을 통해 웹사이트에서 데이터를 추출합니다.

```typescript
import * as cheerio from 'cheerio';

export class CustomAdapter extends BaseAdapter {
  async fetchPrograms(): Promise<ExperienceData[]> {
    const response = await this.http.get('/programs');
    const $ = cheerio.load(response.data);
    
    const programs: ExperienceData[] = [];
    
    $('div.program-item').each((i, el) => {
      const program = {
        externalId: $(el).attr('data-id'),
        programName: $(el).find('h2').text(),
        institutionName: $(el).find('.institution').text(),
        // ... 추가 필드 매핑
      };
      programs.push(program);
    });
    
    return programs;
  }
}
```

**필수 라이브러리 설치**:
```bash
npm install cheerio axios
```

### 방법 3: API 통합 (REST)

특정 API 엔드포인트에서 JSON 데이터를 받아옵니다.

```typescript
export class MuseumAdapter extends BaseAdapter {
  async fetchPrograms(): Promise<ExperienceData[]> {
    const museums = ['nmuseum', 'smuseum'];
    const allPrograms = [];
    
    for (const museum of museums) {
      try {
        const response = await this.http.get(`/${museum}/programs`);
        const mapped = response.data.programs.map(p => 
          this.mapProgram(p, museum)
        );
        allPrograms.push(...mapped);
      } catch (error) {
        console.error(`Failed to fetch ${museum}:`, error);
      }
    }
    
    return allPrograms;
  }
}
```

---

## 🛠️ 새로운 Adapter 만들기

### 단계 1: Adapter 클래스 생성

```typescript
// apps/api/src/crawler/adapters/my-custom.adapter.ts

import { Injectable } from '@nestjs/common';
import { ExperienceData, CrawlSchedule } from '../adapter.interface';
import { BaseAdapter } from './base.adapter';

@Injectable()
export class MyCustomAdapter extends BaseAdapter {
  constructor() {
    super(
      'my-custom',                    // adapter 이름
      'https://api.example.com',      // 대상 URL
      CrawlSchedule.DAILY,            // 크롤 주기
    );

    this.metadata.automationInfo = {
      isAutomatable: true,
      blockers: [],
      notes: 'My custom data source',
    };
  }

  async fetchPrograms(): Promise<ExperienceData[]> {
    try {
      // 데이터 수집 로직
      const response = await this.http.get('/programs');
      const programs = response.data.programs || [];
      
      // ExperienceData로 변환
      return programs.map(p => this.mapProgram(p));
    } catch (error) {
      console.error('MyCustom adapter error:', error);
      return [];
    }
  }

  private mapProgram(program: any): ExperienceData {
    return {
      externalId: program.id,
      institutionName: program.institution,
      programName: program.name,
      description: program.desc,
      capacity: program.limit,
      price: this.normalizePrice(program.fee),
      ageGroup: this.getAgeGroup(program.ages),
      bookingMethod: this.mapBookingMethod(program.method),
      status: this.determineStatus(program.startDate, program.endDate),
      bookingOpenAt: this.parseDate(program.startDate),
      bookingCloseAt: this.parseDate(program.endDate),
      externalSource: 'my-custom',
    };
  }

  private mapBookingMethod(method: string) {
    if (method.includes('선착순')) return 'FIRST_COME';
    if (method.includes('추첨')) return 'LOTTERY';
    return 'FIRST_COME';
  }

  private determineStatus(startDate: string, endDate: string) {
    const now = new Date();
    const start = this.parseDate(startDate);
    const end = this.parseDate(endDate);
    
    if (!start || !end) return 'UNKNOWN';
    if (now < start) return 'OPENING_SOON';
    if (now <= end) return 'OPEN';
    return 'CLOSED';
  }
}
```

### 단계 2: Module에 등록

```typescript
// apps/api/src/crawler/crawler.module.ts

import { MyCustomAdapter } from './adapters/my-custom.adapter';

@Module({
  providers: [
    CrawlerService,
    MyCustomAdapter,  // 추가
    // ... 다른 adapters
  ],
})
export class CrawlerModule {}
```

### 단계 3: CrawlerService에 등록

```typescript
// apps/api/src/crawler/crawler.service.ts

constructor(
  myCustomAdapter: MyCustomAdapter,  // 추가
  // ... 다른 adapters
) {
  this.registerAdapter(myCustomAdapter);
  // ...
}
```

### 단계 4: 테스트

```bash
# 특정 adapter 테스트
curl http://localhost:3001/api/crawler/crawl/my-custom

# 로그에서 결과 확인
npm run dev:api
```

---

## 🔒 Best Practices

### Rate Limiting

```typescript
const CRAWL_DELAYS = {
  'seoul-public-service': 2000,  // 2초
  'museum': 1000,                // 1초
};

await new Promise(resolve => 
  setTimeout(resolve, CRAWL_DELAYS[adapterName])
);
```

### User-Agent 설정

```typescript
headers: {
  'User-Agent': 'WithDKIS-Crawler/1.0 (+https://github.com/imsplendid8/game-app)',
}
```

### robots.txt 준수

```typescript
async checkRobots(path: string): Promise<boolean> {
  try {
    const robots = await fetch(`${this.baseUrl}/robots.txt`);
    const text = await robots.text();
    return !text.includes(`Disallow: ${path}`);
  } catch {
    return true; // 오류 시 크롤 진행
  }
}
```

### 에러 처리

```typescript
try {
  const programs = await adapter.fetchPrograms();
  return programs;
} catch (error) {
  console.error(`Adapter failed:`, error);
  return [];  // 에러 시 빈 배열 반환
}
```

---

## 📊 크롤링 상태 모니터링

### 크롤러 목록 조회

```bash
curl http://localhost:3001/api/crawler/status
```

응답:
```json
{
  "adapters": [
    {
      "name": "mock",
      "enabled": true,
      "schedule": "daily"
    },
    {
      "name": "data-loader",
      "enabled": true,
      "schedule": "daily"
    }
  ]
}
```

### 크롤링 로그

```bash
# Docker 로그 확인
docker compose logs -f api

# 로그 필터링
docker compose logs -f api | grep "Crawler\|Crawl\|adapter"
```

---

## 🔗 데이터 흐름

```
┌─────────────────┐
│   External      │
│   Data Source   │
│ (API, Website)  │
└────────┬────────┘
         │
         │ HTTP Request
         ▼
┌─────────────────┐
│    Adapter      │
│ (e.g., MockAdapter)
│ (e.g., DataLoaderAdapter)
└────────┬────────┘
         │ ExperienceData[]
         ▼
┌─────────────────┐
│ CrawlerService  │
└────────┬────────┘
         │ Programs
         ▼
┌─────────────────┐
│   Database      │
│ (Experiences)   │
└─────────────────┘
         ▲
         │ Query
┌─────────────────┐
│   Frontend      │
│ (User Browse)   │
└─────────────────┘
```

---

## 📚 추가 리소스

- [Adapter Interface](./adapter.interface.ts)
- [BaseAdapter 구현](./adapters/base.adapter.ts)
- [서울 공공서비스예약 어댑터 예제](./adapters/seoul-public-service.adapter.ts)
- [DataLoader 예제](./adapters/data-loader.adapter.ts)
- [크롤러 가이드](../../CRAWLER-GUIDE.md)

---

## 🚀 다음 단계

1. **데이터 import 시작**: JSON 파일 준비 후 data-loader 사용
2. **실제 API 연동**: 공개 API 찾기 및 adapter 구현
3. **웹 스크래핑**: Cheerio를 이용한 HTML 파싱
4. **자동화 스케줄링**: 주기적 크롤링 설정

---

**Last Updated**: 2025-09-14
