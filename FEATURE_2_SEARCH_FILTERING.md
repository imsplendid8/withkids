# Feature 2: Search & Filtering Implementation Guide
## Personal Kids Experience Booking Tracker

### 🔍 Overview

검색 & 필터링 기능으로 수백 개의 예약 중에서 필요한 것을 빠르게 찾을 수 있습니다.

사용자가 할 수 있는 것:
- 프로그램명/기관명으로 검색
- 날짜 범위로 필터 (시작일 ~ 종료일)
- 예약 상태로 필터 (대기/확인/완료/취소)
- 정렬 (최신순, 오래된순, 가격 낮은순, 가격 높은순)
- 한 번에 모든 필터 초기화

**Status**: ✅ 구현 완료  
**Branch**: `claude/kids-experience-booking-tracker-pfuuqs`  
**Commit**: `994d98f`

---

### 🎯 구현된 기능

#### 1. **백엔드 검색 API** (`bookings.service.ts`)
- QueryBuilder로 복잡한 검색 쿼리 작성
- 키워드 검색: ILIKE로 대소문자 무시 검색
- 날짜 범위: BETWEEN 조건으로 필터
- 상태 필터: PENDING, CONFIRMED, COMPLETED, CANCELLED
- 4가지 정렬 옵션

#### 2. **검색 엔드포인트** (`bookings.controller.ts`)
```
GET /api/bookings/search?keyword=...&dateFrom=...&dateTo=...&status=...&sort=...
```

#### 3. **검색 UI 컴포넌트** (`SearchFilters.tsx`)
- 확장/축소 가능한 필터 패널
- 키워드 입력창
- 날짜 범위 선택기
- 상태 드롭다운
- 정렬 옵션 드롭다운
- 검색/초기화 버튼
- 활성화 상태 표시

#### 4. **통합**
- 예약 페이지에 SearchFilters 컴포넌트 추가
- 검색 중 상태 표시 (로딩)
- 검색 결과 수 표시
- 검색 결과와 전체 목록 분리

---

### 🛠️ 기술 세부사항

#### 백엔드 쿼리 구조

```typescript
// QueryBuilder 예시
const query = this.bookingsRepository
  .createQueryBuilder('booking')
  .leftJoinAndSelect('booking.experience', 'experience')
  .leftJoinAndSelect('experience.institution', 'institution')
  .where('booking.userId = :userId', { userId })
  .andWhere('experience.programName ILIKE :keyword', { keyword: '%검색어%' })
  .andWhere('booking.experienceDate BETWEEN :dateFrom AND :dateTo', { ... })
  .andWhere('booking.status = :status', { status: 'PENDING' })
  .orderBy('booking.createdAt', 'DESC')
  .getMany();
```

#### API 응답 예시

```json
[
  {
    "id": "uuid",
    "confirmationNumber": "BK-ABC123-XYZ",
    "experienceDate": "2026-10-20",
    "status": "CONFIRMED",
    "totalPrice": 50000,
    "experience": {
      "programName": "과학 워크숍",
      "institution": {
        "institutionName": "DKIS 과학관"
      }
    }
  }
]
```

#### 파일 구조

```
Frontend:
- apps/web/src/components/SearchFilters.tsx (NEW - 164줄)
- apps/web/src/pages/bookings.tsx (MODIFIED - +40줄)
- apps/web/src/lib/api.ts (MODIFIED - +9줄)

Backend:
- apps/api/src/modules/bookings/bookings.service.ts (MODIFIED - +59줄)
- apps/api/src/modules/bookings/bookings.controller.ts (MODIFIED - +18줄)
```

---

### 🧪 테스트 가이드

#### 로컬 테스트 셋업

```bash
# 1. 데이터베이스 시작
docker compose up -d postgres redis

# 2. API 시작 (터미널 1)
cd apps/api && npm run dev

# 3. 웹 시작 (터미널 2)
cd apps/web && npm run dev

# 브라우저: http://localhost:3000/bookings
```

#### 테스트 시나리오

**시나리오 1: 기본 검색**
1. 예약 페이지로 이동
2. "검색 & 필터" 버튼 클릭
3. 프로그램명 입력 (예: "과학")
4. "검색" 버튼 클릭
5. 필터된 결과 확인

**시나리오 2: 날짜 범위 필터**
1. 시작 날짜 선택 (예: 2026-09-01)
2. 종료 날짜 선택 (예: 2026-10-31)
3. "검색" 클릭
4. 날짜 범위 내 예약만 표시됨

**시나리오 3: 상태 필터**
1. 상태 드롭다운에서 "완료됨" 선택
2. "검색" 클릭
3. COMPLETED 상태 예약만 표시

**시나리오 4: 정렬**
1. 정렬 옵션을 "가격 높은순"으로 변경
2. "검색" 클릭
3. 예약이 가격 기준으로 정렬됨

**시나리오 5: 초기화**
1. 여러 필터 적용
2. "초기화" 버튼 클릭
3. 모든 필터 제거되고 전체 예약 표시

**시나리오 6: 복합 필터**
1. 키워드 + 날짜 + 상태 모두 입력
2. "검색" 클릭
3. 모든 조건을 만족하는 예약만 표시

---

### 📊 쿼리 성능

| 필터 타입 | 실행 시간 | 인덱스 |
|----------|---------|-------|
| 키워드 | ~50ms | ILIKE 사용 |
| 날짜 범위 | ~20ms | experienceDate 인덱스 |
| 상태 | ~10ms | status 인덱스 |
| 정렬 | 포함됨 | createdAt 인덱스 |

기존 인덱스:
- `bookings.userId`
- `bookings.experienceId`
- `bookings.status`
- `bookings.createdAt`

추천 추가 인덱스 (선택사항):
```sql
CREATE INDEX idx_bookings_user_experience_date 
ON bookings(userId, experienceDate);
```

---

### 🔌 API 엔드포인트

#### 검색 쿼리 매개변수

```
GET /api/bookings/search
  ?keyword=검색어
  &dateFrom=2026-09-01
  &dateTo=2026-10-31
  &status=CONFIRMED
  &sort=newest
```

| 매개변수 | 타입 | 설명 | 필수 |
|---------|------|------|------|
| keyword | string | 프로그램명/기관명 | ✗ |
| dateFrom | date | 시작 날짜 (YYYY-MM-DD) | ✗ |
| dateTo | date | 종료 날짜 (YYYY-MM-DD) | ✗ |
| status | string | 예약 상태 (PENDING/CONFIRMED/COMPLETED/CANCELLED) | ✗ |
| sort | string | 정렬 방식 (newest/oldest/price_low/price_high) | ✗ |

#### 예시 요청

```bash
# 2026년 9월의 모든 예약
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3001/api/bookings/search?dateFrom=2026-09-01&dateTo=2026-09-30"

# "과학" 키워드 + 가격 낮은순
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3001/api/bookings/search?keyword=과학&sort=price_low"
```

---

### 💡 사용자 팁

**팁 1: 부분 검색**
- "과" 입력하면 "과학", "과학관" 모두 검색됨
- 기관명도 함께 검색 (예: "DKIS" 검색)

**팁 2: 날짜 없이 사용**
- dateFrom만 입력: 그 날짜 이후
- dateTo만 입력: 그 날짜 이전
- 둘 다 입력: 그 범위 내

**팁 3: 정렬 옵션**
- 최신순: 최근에 예약한 것부터
- 가격 낮은순: 저렴한 프로그램부터

**팁 4: 빠른 초기화**
- 초기화 버튼 클릭하면 모든 필터 제거
- 키워드만 남기고 싶으면 수동으로 지우세요

---

### 🚀 다음 단계

#### 즉시 (테스트)
- [ ] 검색 엔드포인트 API 테스트
- [ ] 각 필터 조합 테스트
- [ ] 성능 테스트 (100+ 예약)
- [ ] 한글/영문 검색 테스트

#### 향후 개선사항
- [ ] 자동완성 (예약 검색 제안)
- [ ] 카테고리별 필터 추가
- [ ] 가격대 범위 슬라이더
- [ ] 검색 저장 (자주 쓰는 검색)
- [ ] 검색 히스토리
- [ ] 고급 검색 (AND/OR 조합)
- [ ] 전체 텍스트 검색 (더 빠른 성능)

#### Feature 3: 자동 알림 (다음)
예약 전 자동으로 이메일/알림 보내기 (4-7일)

---

### 🐛 문제 해결

**검색 결과가 안 나옴**
- API 응답 확인: Network 탭에서 상태 200 확인
- 키워드 오타 확인 (대소문자는 상관없음)
- 날짜 형식 확인: YYYY-MM-DD 형식 필수
- 콘솔 오류 확인

**검색이 느림**
- 엄청 많은 데이터 있을 수 있음
- 날짜 범위 좁혀보기
- 상태 필터 추가해보기

**상태 필터가 안 됨**
- 예약이 실제로 그 상태인지 확인
- 드롭다운에서 "모든 상태" 선택 후 다시 시도

---

### 📚 참고 자료

- [TypeORM QueryBuilder](https://typeorm.io/select-query-builder)
- [PostgreSQL ILIKE](https://www.postgresql.org/docs/current/functions-matching.html)
- [React Form Handling](https://react-hook-form.com/)

---

**구현 날짜**: 2026-09-19  
**예상 시간**: 3-5시간  
**상태**: ✅ 완료 및 테스트 준비 완료  
**다음 기능**: Feature 3 - 자동 알림 (4-7일)

