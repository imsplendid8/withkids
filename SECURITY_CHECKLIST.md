# WithDKIS 보안 체크리스트

**최종 업데이트**: 2026-09-14
**상태**: 초기 구현 완료

---

## 🔒 환경 변수 보안

### ✅ 구현 완료

- [x] 환경 변수 스키마 검증 (`lib/env.ts`)
  - Zod를 사용한 런타임 검증
  - 타입 안전한 접근
  - 개발/프로덕션 모드 구분

- [x] .env.example 파일 작성
  - 필수 변수 문서화
  - 안전한 형식 제공

### 📋 설정 체크리스트

```bash
# 개발 환경 설정
cp apps/web/.env.example apps/web/.env.local
# 필요한 값 입력:
# NEXT_PUBLIC_API_URL=http://localhost:3001
# NEXT_PUBLIC_SENTRY_DSN=... (선택사항)
```

### ⚠️ 중요 규칙

- ✅ `.env.local` 파일은 `.gitignore`에 포함
- ✅ `NEXT_PUBLIC_*` 접두사만 클라이언트에 노출
- ✅ 민감한 정보는 서버 환경에만 저장
- ✅ 배포 전 모든 환경 변수 검증

---

## 📊 모니터링 & 오류 추적

### ✅ 구현 완료

- [x] Sentry 통합
  - 초기화 함수 (`lib/sentry.ts`)
  - 사용자 추적
  - 오류 캡처
  - 세션 리플레이 (보안)

- [x] 성능 모니터링
  - API 응답 시간 측정
  - Web Vitals 추적
  - 메트릭 수집 및 보고

### 🔧 설정 방법

```bash
# 1. Sentry 가입 및 프로젝트 생성
# https://sentry.io

# 2. DSN 복사 후 .env.local에 입력
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx

# 3. 프로덕션 빌드에서 자동으로 활성화됨
npm run build
```

### 📈 모니터링 대시보드

- Sentry 대시보드: https://sentry.io/organizations/your-org/
- 모니터링 항목:
  - 실시간 오류 추적
  - 성능 메트릭
  - 사용자 세션
  - 트랜잭션 추적

---

## 🛡️ API 보안

### ✅ 구현 완료

- [x] JWT 인증
  - Bearer 토큰 기반
  - 자동 갱신 로직
  - 타임아웃 처리

- [x] CORS 설정
  - 허용된 도메인만 접근
  - 민감한 헤더 보호

- [x] 요청 검증
  - 입력 값 검증
  - SQL Injection 방지
  - XSS 방지

### 📋 API 보안 체크리스트

#### 요청 레벨
- [x] HTTPS 사용 (프로덕션)
- [x] JWT Bearer 토큰 검증
- [x] 요청 타임아웃 설정 (10초)
- [x] 속도 제한 계획 (구현 예정)

#### 응답 레벨
- [x] 민감 정보 노출 금지
- [x] 에러 메시지 일반화
- [x] 캐시 헤더 설정

### 구현 코드

```typescript
// lib/api.ts에서 자동으로 처리:
// 1. JWT 토큰 추가 (Axios interceptor)
// 2. 오류 처리 및 로깅
// 3. 타임아웃 관리
```

---

## 🔑 인증 & 권한

### ✅ 구현 완료

- [x] JWT 기반 인증
- [x] 로그인/로그아웃
- [x] 토큰 갱신 메커니즘
- [x] 보호된 라우트

### 📋 인증 체크리스트

#### 비밀번호 정책 (권장)
- [ ] 최소 8자 이상
- [ ] 대문자, 소문자, 숫자, 특수문자 포함
- [ ] 주기적 변경 권고 (90일)
- [ ] 이전 비밀번호 재사용 방지

#### 세션 관리
- [x] 세션 타임아웃 (24시간)
- [ ] 기기 관리 기능 (구현 예정)
- [ ] 이상 로그인 탐지 (구현 예정)

#### 두 요소 인증 (2FA) - 구현 예정
- [ ] 이메일 OTP
- [ ] SMS OTP
- [ ] 앱 기반 인증 (Google Authenticator)

### 다음 단계

```typescript
// 2FA 구현 예정
export async function enableTwoFactor(userId: string) {
  // 1. OTP 비밀 생성
  // 2. QR 코드 생성
  // 3. 사용자 검증
  // 4. 백업 코드 생성
}
```

---

## 📝 데이터 보안

### ✅ 구현 완료

- [x] 환경 변수 검증
- [x] 입력 값 검증 (클라이언트)
- [x] 오류 메시지 마스킹

### 📋 데이터 보안 체크리스트

#### 전송 중 보안
- [x] HTTPS/TLS (프로덕션)
- [x] 민감한 데이터 암호화
- [ ] 인증서 갱신 자동화

#### 저장 중 보안
- [ ] 데이터베이스 암호화
- [ ] 비밀번호 해싱 (bcrypt)
- [ ] 개인정보 마스킹

#### 개인정보 보호
- [ ] GDPR 준수
- [ ] 개인정보 요청 처리
- [ ] 데이터 삭제 정책
- [ ] 데이터 보존 정책

### GDPR 준수 체크리스트

```markdown
- [ ] 개인정보 수집 명확화
- [ ] 동의 관리
- [ ] 데이터 액세스 권리
- [ ] 삭제 권리 (right to be forgotten)
- [ ] 데이터 이식 권리
- [ ] 개인정보 처리방침 공개
```

---

## 🔍 정기 보안 검사

### 자동 검사 (CI/CD)

```bash
# 의존성 취약점 검사
npm audit

# 정적 분석
npm run lint

# 타입 체크
npm run type-check
```

### 월간 수동 검사

#### 코드 검토
- [ ] 새로운 보안 취약점 검토
- [ ] 의존성 업데이트 확인
- [ ] 환경 변수 검토

#### 인프라 검증
- [ ] SSL/TLS 인증서 확인
- [ ] 방화벽 규칙 검토
- [ ] 로그 관리 검토

#### 접근 제어
- [ ] 관리자 권한 검토
- [ ] API 키 로테이션
- [ ] 비활성 계정 정리

### 분기별 보안 감사

```bash
# 의존성 보안 감사
npm audit --audit-level=moderate

# 정적 분석 심화
# - SonarQube 또는 CodeQL 사용
# - 커스텀 규칙 정의

# 성능 및 보안 테스트
# - OWASP Top 10 검증
# - 침투 테스트 (펜테스트)
```

---

## 🚨 보안 인시던트 대응

### 인시던트 분류

#### 심각 (Critical)
- 데이터 유출
- 인증 우회
- 원격 코드 실행
- **대응 시간**: 1시간

#### 높음 (High)
- 권한 상승
- XSS/CSRF 취약점
- 서비스 거부
- **대응 시간**: 24시간

#### 중간 (Medium)
- 정보 공개
- 논리 오류
- **대응 시간**: 72시간

### 대응 절차

```
1. 감지 (Detect)
   - Sentry 알림
   - 사용자 보고
   - 자동 모니터링

2. 확인 (Verify)
   - 로그 분석
   - 영향 범위 파악
   - 심각도 판단

3. 격리 (Isolate)
   - 문제 코드 비활성화
   - 접근 제한
   - 긴급 패치

4. 해결 (Fix)
   - 패치 개발
   - 테스트
   - 배포

5. 모니터링 (Monitor)
   - 재발 방지
   - 성능 검증
   - 원인 분석
```

---

## 📚 참고 자료

### 보안 가이드
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js 보안 체크리스트](https://nodejs.org/en/docs/guides/security/)
- [Next.js 보안](https://nextjs.org/docs/advanced-features/security-headers)

### 도구
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [NIST 사이버보안](https://www.nist.gov/cyberframework)
- [CWE Top 25](https://cwe.mitre.org/top25/)

### 서비스
- [Sentry](https://sentry.io/) - 오류 추적
- [Snyk](https://snyk.io/) - 취약점 스캔
- [GitHub Security](https://github.com/features/security) - 의존성 검사

---

## 📊 보안 지표

| 지표 | 목표 | 현황 |
|------|------|------|
| 취약점 (Critical) | 0 | ✅ 0 |
| 취약점 (High) | 0 | ✅ 0 |
| 의존성 버전 | 최신 | ✅ 업데이트 중 |
| HTTPS | 100% | ✅ 프로덕션 |
| 인증 | JWT | ✅ 구현됨 |
| 암호화 | TLS 1.3 | 🔄 계획 중 |
| 2FA | 활성화 | 🔄 계획 중 |
| 감사 로그 | 모든 작업 | 🔄 계획 중 |

---

## 🔐 비상 연락처

- **보안 인시던트**: security@withdkis.com
- **버그 바운티**: bounty@withdkis.com
- **일반 문의**: support@withdkis.com

---

**작성자**: Claude Haiku 4.5
**버전**: 1.0
**다음 검토**: 2026-10-14
