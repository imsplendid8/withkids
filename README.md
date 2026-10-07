# WithDKIS - 아이 체험 프로그램 추적 시스템

아이와 함께 참여할 수 있는 공공기관, 박물관, 과학관, 기업 공장견학 등의 저가·무료·희소 체험 프로그램을 발견하고, 선착순 접수 시작일을 놓치지 않도록 추적하는 개인용 예약 시스템입니다.

## 🌐 인터넷 주소로 쓰기 (설치 필요 없음)

**https://imsplendid8.github.io/<저장소 이름>** (예: `WITHKIDS`) 에서 PC·휴대폰 어디서나 바로 열립니다. 저장소 이름을 바꾸면 다음 배포부터 주소도 따라 바뀝니다.

- 프로그램 정보는 매일 아침 6시에 GitHub Actions가 서울시 API에서 가져와 다시 배포합니다.
  바로 새로 가져오려면 대시보드의 **데이터 수집 → 지금 수집하기** 를 누르고, 열린 GitHub 화면에서 **Run workflow** 를 누르세요.
- 서울시 인증키는 저장소 **Settings → Secrets and variables → Actions → New repository secret** 에
  이름 `SEOUL_OPENAPI_KEY` 로 넣습니다. 이 값은 공개되지 않습니다.
- 예약·후기·찜은 **그 브라우저에만** 저장됩니다(서버 없음). 기기를 옮기거나 브라우저 기록을 지우기 전에
  **프로필 → 백업** 에서 파일로 저장해 두세요.
- 로그인 화면은 없습니다. 주소를 아는 사람은 누구나 화면을 볼 수 있지만, 예약 내용은 각자 자기 브라우저에만 있습니다.

> 매일 자동 수집은 이 워크플로(`.github/workflows/pages.yml`)가 `main` 브랜치에 있어야 동작합니다.

## 🪟 Windows에서 쓰기 (터미널 필요 없음)

1. [Docker Desktop](https://www.docker.com/products/docker-desktop/)을 설치합니다. (처음 한 번)
2. `game-app` 폴더의 **`시작하기.bat`** 을 더블클릭합니다.
   - 설정 파일(`.env`)과 비밀번호는 자동으로 만들어집니다.
   - 서울시 인증키를 지금 넣을지 묻습니다. 넣겠다고 하면 메모장이 열리니 `SEOUL_OPENAPI_KEY=` 뒤에 붙여넣고 저장한 뒤 닫으세요.
   - 준비가 끝나면 브라우저가 열립니다.
3. 처음 열면 **계정 만들기** 화면이 나옵니다. 한 번만 만들면 되고, 그 뒤로는 다른 사람이 가입할 수 없습니다.
4. 대시보드의 **접수 일정 → 데이터 수집 → 지금 수집하기** 를 누르면 바로 수집하고 결과를 보여줍니다.
   인증키가 없거나 틀리면 그 이유가 그 자리에 표시됩니다.

끌 때는 **`중지하기.bat`** 을 더블클릭합니다. 저장한 데이터는 지워지지 않습니다.
인증키를 나중에 넣으려면 `.env`를 메모장으로 열어 `SEOUL_OPENAPI_KEY=` 뒤에 붙여넣고, `시작하기.bat`을 다시 실행하세요.

## 🎯 프로젝트 목표

**핵심 목표**: 사용자의 관심사는 "어디서 할 수 있는가"가 아니라 **"언제 신청할 수 있는가"**입니다.

- 📋 다양한 체험 프로그램 발견 및 추적
- 🔔 중요한 신청 시간 알림
- 📊 과거 패턴 분석으로 다음 신청 시간 예측
- 🤖 향후 자동화 신청 기능

## 📁 프로젝트 구조

```
game-app/
├── apps/
│   ├── api/              # Nest.js Backend API
│   └── web/              # Next.js Frontend
├── packages/
│   ├── database/         # Database entities & constants
│   ├── types/            # Shared TypeScript types
│   └── utils/            # Utility functions
├── docker-compose.yml    # Database & Redis containers
├── .env.example          # Environment variables template
└── package.json          # Root monorepo config
```

## 🚀 빠른 시작

### 필수 요구사항

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker & Docker Compose (optional for database)

### 설치

1. **저장소 클론**
   ```bash
   git clone https://github.com/imsplendid8/game-app.git
   cd game-app
   ```

2. **환경 변수 설정**
   ```bash
   cp .env.example .env
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env
   ```

3. **Docker 컨테이너 시작** (선택사항)
   ```bash
   docker-compose up -d
   # PostgreSQL이 localhost:5432에서 실행됩니다
   # Adminer(관리 도구)는 localhost:8080에서 실행됩니다
   ```

4. **의존성 설치**
   ```bash
   npm install
   ```

### 개발 서버 실행

#### 모두 실행
```bash
npm run dev
# Backend: http://localhost:3001
# Frontend: http://localhost:3000
# API Docs: http://localhost:3001/api/docs
```

#### 개별 실행
```bash
npm run dev:api    # Backend만
npm run dev:web    # Frontend만
```

## 🏗️ 기술 스택

### Backend
- **Framework**: Nest.js
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Caching**: Redis
- **API Documentation**: Swagger/OpenAPI

### Frontend
- **Framework**: Next.js 14
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **State Management**: Zustand

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Code Quality**: ESLint, Prettier
- **Testing**: Jest

## 📝 주요 파일 가이드

| 파일 | 설명 |
|------|------|
| `ARCHITECTURE.md` | 전체 시스템 아키텍처 설계 |
| `DATABASE-SCHEMA.md` | PostgreSQL 스키마 상세 문서 |
| `IMPLEMENTATION_ROADMAP.md` | 6단계 구현 계획 (8-12주) |
| `design-docs.html` | 공개 웹 페이지 설계 문서 |

## 🔗 API 엔드포인트

### Health Check
```
GET /health
```

### Institutions (기관)
```
GET    /institutions          # 모든 기관 조회
POST   /institutions          # 기관 생성
GET    /institutions/:id      # 특정 기관 조회
PUT    /institutions/:id      # 기관 수정
DELETE /institutions/:id      # 기관 삭제 (soft delete)
```

### Experiences (체험 프로그램)
```
GET    /experiences           # 모든 프로그램 조회
POST   /experiences           # 프로그램 생성
GET    /experiences/:id       # 특정 프로그램 조회
PUT    /experiences/:id       # 프로그램 수정
DELETE /experiences/:id       # 프로그램 삭제 (soft delete)
```

### Swagger 문서
Backend 실행 시 http://localhost:3001/api/docs에서 확인 가능

## 💾 데이터베이스

### 초기화 및 마이그레이션
```bash
npm run db:migrate    # 마이그레이션 실행
npm run db:seed       # 샘플 데이터 입력
```

### Adminer로 데이터 관리
Docker Compose 실행 시 http://localhost:8080에서 접근 가능
- **Server**: postgres
- **Username**: postgres
- **Password**: password

## 📚 개발 가이드

### 코드 스타일
```bash
npm run lint           # ESLint 실행
npm run lint:fix       # 자동 수정
npm run format         # Prettier 포맷팅
npm run format:check   # 포맷 확인
```

### 테스트
```bash
npm run test           # 모든 테스트 실행
npm run test:watch     # Watch 모드
npm run test:cov       # Coverage 리포트
```

### 빌드
```bash
npm run build          # 모든 패키지 빌드
npm run build:api      # Backend만 빌드
npm run build:web      # Frontend만 빌드
```

## 🎓 Phase 1 체크리스트

- [x] 프로젝트 구조 설정
- [x] Backend (Nest.js) 기본 세팅
- [x] Frontend (Next.js) 기본 세팅
- [x] Docker Compose 설정
- [x] TypeScript & ESLint 설정
- [ ] 데이터베이스 마이그레이션 작성
- [ ] 샘플 데이터 입력
- [ ] API 테스트

## 🔗 중요 링크

- 📖 [설계 문서](https://claude.ai/code/artifact/08230054-7346-4990-84a6-65533ac7f7c5) - 공개 웹 페이지
- 🏗️ [아키텍처](./ARCHITECTURE.md)
- 🗄️ [데이터베이스](./DATABASE-SCHEMA.md)
- 📋 [로드맵](./IMPLEMENTATION_ROADMAP.md)

## 👥 기여자

- WithDKIS Team

## 📄 라이선스

MIT License - 자세한 사항은 LICENSE 파일을 참조하세요.

## 📞 지원

이슈는 GitHub Issues에 등록해주세요.

---

**현재 Phase**: Phase 1 (Foundation & Core Infrastructure)

**다음 단계**: Phase 2 (Crawler Infrastructure) - 자동 데이터 수집
