# 개발 가이드

## 🚀 로컬 환경 설정

### 1. Docker 시작
```bash
docker-compose up -d
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 데이터베이스 마이그레이션
```bash
npm run db:migrate
```

### 4. 샘플 데이터 입력
```bash
npm run db:seed
```

### 5. 개발 서버 시작
```bash
npm run dev
```

---

## 📂 프로젝트 구조 상세

### Backend (`apps/api`)
```
src/
├── modules/
│   ├── health/                # Health check
│   ├── institutions/          # 기관 관리
│   ├── experiences/           # 프로그램 관리
│   ├── experience-runs/       # 프로그램 회차 관리
│   ├── change-logs/           # 변화 추적 및 로깅
│   │   ├── entities/
│   │   ├── change-logs.service.ts
│   │   ├── change-logs.controller.ts
│   │   └── change-logs.module.ts
│   └── booking-patterns/      # 예약 패턴 분석
│       ├── entities/
│       │   ├── booking-pattern.entity.ts
│       │   ├── pattern-evidence.entity.ts
│       │   └── booking-prediction.entity.ts
│       ├── booking-patterns.service.ts
│       ├── booking-patterns.controller.ts
│       └── booking-patterns.module.ts
├── crawler/
│   ├── adapter.interface.ts       # Adapter 인터페이스
│   ├── adapters/
│   │   └── seoul-public-service.adapter.ts  # 서울 공공서비스예약 API
│   ├── entities/
│   │   ├── crawl-history.entity.ts
│   │   └── adapter-state.entity.ts
│   ├── crawler.service.ts         # Crawler 조정 서비스
│   ├── crawl-monitoring.service.ts # 크롤러 모니터링
│   ├── crawl-monitoring.controller.ts
│   └── crawler.module.ts
├── database/
│   ├── data-source.ts             # TypeORM 설정
│   ├── migrations/                # DB 마이그레이션
│   │   ├── 1_CreateInstitutions.ts
│   │   ├── 2_CreateExperiences.ts
│   │   ├── 3_CreateExperienceRuns.ts
│   │   ├── 4_CreateChangeLogs.ts
│   │   ├── 5_CreateBookingPatterns.ts
│   │   ├── 6_CreatePatternEvidence.ts
│   │   ├── 7_CreateBookingPredictions.ts
│   │   ├── 8_CreateCrawlHistory.ts
│   │   └── 9_CreateAdapterState.ts
│   └── seeds/                # 샘플 데이터
├── app.module.ts              # Root module
└── main.ts                    # 진입점
```

### Frontend (`apps/web`)
```
src/
├── pages/
│   ├── _app.tsx              # App wrapper
│   ├── _document.tsx         # HTML document
│   └── index.tsx             # Home page
├── components/               # React components (향후)
├── hooks/                    # Custom hooks (향후)
├── store/                    # State management (향후)
├── styles/
│   └── globals.css           # Tailwind CSS
└── utils/                    # Utility functions (향후)
```

---

## 🔌 API 엔드포인트

### Health Check
```
GET http://localhost:3001/health
```

### Institutions
```
GET    http://localhost:3001/api/institutions
POST   http://localhost:3001/api/institutions
GET    http://localhost:3001/api/institutions/:id
PUT    http://localhost:3001/api/institutions/:id
DELETE http://localhost:3001/api/institutions/:id
```

### Experiences
```
GET    http://localhost:3001/api/experiences
POST   http://localhost:3001/api/experiences
GET    http://localhost:3001/api/experiences/:id
PUT    http://localhost:3001/api/experiences/:id
DELETE http://localhost:3001/api/experiences/:id
```

### Experience Runs
```
GET    http://localhost:3001/api/experience-runs
GET    http://localhost:3001/api/experience-runs?upcoming=true
POST   http://localhost:3001/api/experience-runs
GET    http://localhost:3001/api/experience-runs/:id
GET    http://localhost:3001/api/experience-runs/experience/:experienceId
PUT    http://localhost:3001/api/experience-runs/:id
DELETE http://localhost:3001/api/experience-runs/:id
```

### Change Logs
```
GET    http://localhost:3001/api/change-logs/experience-run/:experienceRunId
GET    http://localhost:3001/api/change-logs/severity/:severity
GET    http://localhost:3001/api/change-logs/type/:changeType
GET    http://localhost:3001/api/change-logs/recent
GET    http://localhost:3001/api/change-logs/critical
```

### Booking Patterns
```
GET    http://localhost:3001/api/booking-patterns/experience/:experienceId
GET    http://localhost:3001/api/booking-patterns/pattern/:patternId/accuracy
GET    http://localhost:3001/api/booking-patterns/high-confidence
GET    http://localhost:3001/api/booking-patterns/experience/:experienceId/analysis
GET    http://localhost:3001/api/booking-patterns/predictions/experience/:experienceId
GET    http://localhost:3001/api/booking-patterns/predictions/upcoming
GET    http://localhost:3001/api/booking-patterns/predictions/high-confidence
```

### Crawler Monitoring
```
GET    http://localhost:3001/api/crawler-monitoring/history/:adapterName
GET    http://localhost:3001/api/crawler-monitoring/adapter-state/:adapterName
GET    http://localhost:3001/api/crawler-monitoring/failed-crawls
GET    http://localhost:3001/api/crawler-monitoring/unhealthy-adapters
GET    http://localhost:3001/api/crawler-monitoring/stats
PATCH  http://localhost:3001/api/crawler-monitoring/adapter-state/:adapterName/reset
```

### Swagger Documentation
```
http://localhost:3001/api/docs
```

---

## 🗄️ 데이터베이스 관리

### Adminer (DB 관리 도구)
```
http://localhost:8080
- Server: postgres
- Username: postgres
- Password: password
```

### 마이그레이션 명령어
```bash
# 마이그레이션 실행
npm run db:migrate

# 새 마이그레이션 생성
npm run db:migrate:create -- src/database/migrations/MyMigration

# 샘플 데이터 입력
npm run db:seed
```

---

## 📝 코드 스타일 & 품질

### ESLint & Prettier
```bash
# ESLint 실행
npm run lint

# 자동 수정
npm run lint:fix

# Prettier 포맷팅
npm run format

# 포맷 확인
npm run format:check
```

### 설정 파일
- `.eslintrc.json` - ESLint 규칙
- `.prettierrc` - Prettier 포맷 설정

---

## 🧪 테스트

### Jest 테스트
```bash
# 모든 테스트 실행
npm run test

# Watch 모드
npm run test:watch

# Coverage 리포트
npm run test:cov
```

### 테스트 파일 위치
```
src/
├── modules/health/health.controller.spec.ts
└── app.module.spec.ts
```

---

## 🐛 Debug

### VSCode Launch Configuration
`.vscode/launch.json` 추가:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Backend",
      "program": "${workspaceFolder}/apps/api/dist/main.js",
      "cwd": "${workspaceFolder}/apps/api",
      "restart": true,
      "runtimeArgs": ["--nolazy"],
      "console": "integratedTerminal"
    }
  ]
}
```

### 로그 확인
```bash
# Backend 로그 보기
npm run dev:api

# Frontend 로그 보기
npm run dev:web
```

---

## 🔧 환경 변수

### Backend (`.env` in `apps/api`)
```
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/withdkis_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret
JWT_EXPIRATION=7d
```

### Frontend (`.env.local` in `apps/web`)
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

## 📦 의존성 추가

### Backend에 패키지 추가
```bash
cd apps/api
npm install <package-name>
```

### Frontend에 패키지 추가
```bash
cd apps/web
npm install <package-name>
```

### 공용 패키지 수정
```bash
cd packages/<package-name>
npm install <package-name>
```

---

## 🔄 Git Workflow

### 새 기능 개발
```bash
# Feature branch 생성
git checkout -b feature/new-feature

# 작업 후 커밋
git add .
git commit -m "feat: 새로운 기능 추가"

# Push
git push origin feature/new-feature

# PR 생성
```

### 커밋 메시지 규칙
- `feat:` - 새로운 기능
- `fix:` - 버그 수정
- `docs:` - 문서 변경
- `refactor:` - 코드 리팩토링
- `test:` - 테스트 추가
- `ci:` - CI/CD 설정

---

## 🚨 문제 해결

### Docker 연결 실패
```bash
# Docker 재시작
docker-compose down
docker-compose up -d

# 상태 확인
docker-compose ps
```

### 포트 이미 사용 중
```bash
# 포트 확인
lsof -i :3000  # Frontend
lsof -i :3001  # Backend
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis

# 프로세스 종료
kill -9 <PID>
```

### 의존성 문제
```bash
# node_modules 제거 및 재설치
rm -rf node_modules package-lock.json
npm install
```

### 데이터베이스 초기화
```bash
# 데이터 삭제 (주의!)
docker-compose exec postgres psql -U postgres -c "DROP DATABASE withdkis_dev;"
docker-compose exec postgres psql -U postgres -c "CREATE DATABASE withdkis_dev;"

# 마이그레이션 재실행
npm run db:migrate
npm run db:seed
```

---

## 📚 참고 문서

- [시스템 아키텍처](./ARCHITECTURE.md)
- [데이터베이스 스키마](./DATABASE-SCHEMA.md)
- [구현 로드맵](./IMPLEMENTATION_ROADMAP.md)

