# 배포 가이드

WithDKIS 프로젝트의 배포 및 운영 가이드입니다.

## 목차

1. [로컬 개발 환경](#로컬-개발-환경)
2. [테스트](#테스트)
3. [빌드](#빌드)
4. [Docker 배포](#docker-배포)
5. [환경 변수](#환경-변수)
6. [CI/CD 파이프라인](#cicd-파이프라인)
7. [모니터링](#모니터링)
8. [문제 해결](#문제-해결)

## 로컬 개발 환경

### 필수 요구사항

- Node.js 18.0.0 이상
- npm 9.0.0 이상
- Docker & Docker Compose (선택사항)
- PostgreSQL 14+ (로컬 DB 사용 시)

### 설치 및 시작

```bash
# 1. 저장소 클론
git clone https://github.com/imsplendid8/game-app.git
cd game-app

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정
cp .env.example .env.local

# 4. 개발 서버 시작
npm run dev

# API 서버: http://localhost:3001
# Web 앱: http://localhost:3000
```

### 개발 스크립트

```bash
# 전체 개발 서버 시작
npm run dev

# 개별 서버 시작
npm run dev:api    # API 서버만
npm run dev:web    # 웹 앱만

# 타입 체크
npm run type-check --workspaces

# 린트
npm run lint --workspaces

# 포맷
npm run format --workspaces
```

## 테스트

### 테스트 실행

테스트는 두 종류다.

| 명령 | 내용 | 필요한 것 |
|---|---|---|
| `npm test` | API·웹 단위 테스트 (약 10초) | 없음 |
| `npm run test:e2e` | 실제 DB로 앱을 띄워 HTTP 요청까지 확인 | Postgres, Redis |

```bash
# 단위 테스트 (인프라 없이)
npm test

# 통합 테스트: DB·Redis를 먼저 띄운다
docker compose up -d postgres redis
npm run test:e2e

# 한쪽만
npm test --workspace=apps/api
npm test --workspace=apps/web

# 커밋 전에 CI와 같은 순서로
npm run type-check && npm run lint && npm test && npm run build
```

통합 테스트는 Postgres·Redis에 닿지 않으면 멈추지 않고, 무엇을 띄워야 하는지
알려주며 바로 실패한다. 테스트가 만든 계정·예약은 끝나면 지운다.

CI(GitHub Actions)는 푸시할 때마다 위 단계를 모두 돌리고, 통합 테스트도
Postgres·Redis 컨테이너를 띄워 실행한다.

### 테스트 작성 가이드

- 테스트 파일: `src/**/__tests__/**/*.test.ts` 또는 `src/**/*.test.ts`
- 스토어 테스트: `renderHook`과 `act` 사용
- 컴포넌트 테스트: `@testing-library/react` 사용

예시:
```typescript
import { renderHook, act } from '@testing-library/react'
import { useStore } from '@/store'

describe('useStore', () => {
  it('should update state', () => {
    const { result } = renderHook(() => useStore())
    
    act(() => {
      result.current.setValue('new value')
    })
    
    expect(result.current.value).toBe('new value')
  })
})
```

## 빌드

### 프로덕션 빌드

```bash
# 전체 빌드
npm run build

# 개별 빌드
npm run build:api
npm run build:web
```

### 빌드 확인

```bash
# 웹 앱 빌드 결과 확인
npm run start --workspace=apps/web

# API 서버 빌드 결과 확인
npm run start --workspace=apps/api
```

## Docker 배포

### 구조

브라우저는 **웹(3000) 한 곳만** 호출한다. `/api/*` 요청은 Next.js가
API 컨테이너로 넘긴다(`next.config.js`의 rewrite). 그래서

- 외부에 열어야 할 포트가 **하나뿐**이고
- CORS 설정이 필요 없으며
- 접속 주소가 바뀌어도 프런트를 다시 빌드하지 않아도 된다

DB·Redis·API 포트는 `127.0.0.1`에만 바인딩되어 외부에서 직접 닿지 않는다.

```
브라우저 → web:3000 ─┬─ 페이지
                      └─ /api/* → api:3001 → postgres / redis
```

### 설정

```bash
cp .env.example .env
```

`.env`에서 최소 세 개는 반드시 채운다. 비워두면 실행이 거부된다.

```env
POSTGRES_PASSWORD=...
REDIS_PASSWORD=...
JWT_SECRET=$(openssl rand -base64 48)   # 값을 직접 넣을 것
```

### 실행

```bash
# 로컬에서만 사용 (http://localhost:3000)
docker compose up -d --build

# DB 확인용 Adminer도 함께 (http://localhost:8080)
docker compose --profile tools up -d

# 중지
docker compose down

# 로그
docker compose logs -f web api
```

첫 실행 후 계정을 만든다. 회원가입 UI가 없으므로 한 번만 API로 만든다.

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"내메일@example.com","password":"비밀번호","profileName":"이름"}'
```

이후 `http://localhost:3000/login` 에서 로그인한다.

## 외부에서 접속하기 (Cloudflare Tunnel)

집 PC에서 돌리면서 밖에서도 접속하려면 Cloudflare Tunnel을 쓴다.
공유기 포트포워딩이 필요 없고, 열린 포트도 생기지 않는다.

### 1. 터널 만들기

1. https://one.dash.cloudflare.com 접속 (무료 플랜으로 충분)
2. **Networks > Tunnels > Create a tunnel** > Cloudflared 선택
3. 터널 이름을 정하면 **토큰**이 나온다. `.env`에 넣는다.

```env
CLOUDFLARE_TUNNEL_TOKEN=eyJ...
```

4. 같은 화면의 **Public Hostname** 탭에서 연결할 주소를 지정한다.
   - Subdomain/Domain: 본인 도메인 (Cloudflare에 등록된 것)
   - Service: `HTTP` / `web:3000`

도메인이 없으면 Cloudflare에서 하나 사거나(연 1만원대),
아래 "도메인 없이 임시로 열기"를 참고한다.

### 2. 실행

```bash
docker compose --profile tunnel up -d --build
```

이제 지정한 주소로 어디서든 접속된다.

### 3. 나만 접속하도록 잠그기 (중요)

터널 주소는 인터넷에 공개된다. 앱 자체 로그인이 있지만,
Cloudflare Access를 앞에 두면 로그인 화면조차 남에게 보이지 않는다.

1. **Zero Trust > Access > Applications > Add an application** > Self-hosted
2. 터널에 지정한 주소를 입력
3. Policy: Action `Allow`, Include **Emails** > 본인 이메일만 추가

이후 접속하면 Cloudflare가 먼저 이메일 인증을 요구한다. 무료 플랜에서
50명까지 지원하므로 개인 용도로는 비용이 들지 않는다.

### 도메인 없이 임시로 열기

주소가 매번 바뀌므로 테스트용으로만 쓴다. 접근 제한도 걸 수 없다.

```bash
docker compose up -d --build
cloudflared tunnel --url http://localhost:3000
```

출력되는 `https://....trycloudflare.com` 주소로 접속한다.

### 개별 컨테이너 관리

```bash
# 특정 컨테이너 재시작
docker compose restart web

# 이미지 다시 빌드 (코드 변경 후)
docker compose up -d --build web

# 로그 보기
docker compose logs -f web
```

## 환경 변수

### 설정 파일

- `.env.example`: 필수 환경 변수 템플릿
- `.env.local`: 로컬 개발 환경 (git ignore)
- `.env.production`: 프로덕션 환경 변수

### 필수 환경 변수

#### API 서버 (`apps/api/.env`)

```env
# 데이터베이스
DATABASE_URL=postgresql://user:password@localhost:5432/withdkis

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=24h

# 서버
NODE_ENV=development
PORT=3001

# 이메일 (선택)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

#### 웹 앱 (`apps/web/.env.local`)

```env
# API 주소
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## CI/CD 파이프라인

### GitHub Actions 워크플로우

자동 실행:
- **main/develop/claude/** 브랜치 푸시
- 풀 리퀘스트 생성

자동 체크:
1. ✅ 타입 체크 (TypeScript)
2. ✅ 린트 (ESLint)
3. ✅ 테스트 (Jest)
4. ✅ 빌드
5. ✅ 보안 스캔 (npm audit)
6. 🐳 Docker 빌드 (main/develop만)

### 워크플로우 상태 확인

```bash
# GitHub Actions 상태 확인
gh run list

# 특정 워크플로우 로그
gh run view <run-id>
```

## 모니터링

### 로그 확인

```bash
# Docker 로그
docker compose logs -f web
docker compose logs -f api

# 특정 시간 이후 로그
docker compose logs --since 2024-09-13T10:00:00 web
```

### 헬스 체크

```bash
# API 헬스 체크
curl http://localhost:3001/health

# 웹 앱 확인
curl http://localhost:3000
```

## 문제 해결

### 포트 충돌

```bash
# 포트 사용 확인
lsof -i :3000
lsof -i :3001

# 프로세스 종료
kill -9 <PID>
```

### 의존성 문제

```bash
# 깨끗한 설치
rm -rf node_modules package-lock.json
npm install

# 캐시 삭제
npm cache clean --force
```

### 데이터베이스 연결 문제

```bash
# PostgreSQL 연결 테스트
psql postgresql://user:password@localhost:5432/withdkis

# 마이그레이션 실행
npm run db:migrate --workspace=apps/api

# 시드 데이터 생성
npm run db:seed --workspace=apps/api
```

### Docker 컨테이너 재설정

```bash
# 모든 컨테이너 및 볼륨 삭제
docker compose down -v

# 재구축 및 시작
docker compose up --build
```

## 배포 체크리스트

### 프로덕션 배포 전

- [ ] 모든 테스트 통과 (npm run test)
- [ ] 린트 오류 없음 (npm run lint)
- [ ] 빌드 성공 (npm run build)
- [ ] 환경 변수 설정 완료
- [ ] 데이터베이스 마이그레이션 완료
- [ ] 보안 스캔 완료 (npm audit)
- [ ] README 및 문서 업데이트
- [ ] CHANGELOG 업데이트
- [ ] 버전 번호 업데이트 (package.json)

### 배포 후

- [ ] 헬스 체크 통과
- [ ] 주요 기능 동작 확인
- [ ] 로그 모니터링
- [ ] 사용자 피드백 수집
- [ ] 백업 확인

## 추가 정보

- 아키텍처: [ARCHITECTURE.md](./ARCHITECTURE.md)
- 개발 가이드: [DEVELOPMENT.md](./DEVELOPMENT.md)
- 데이터베이스: [DATABASE-SCHEMA.md](./DATABASE-SCHEMA.md)
