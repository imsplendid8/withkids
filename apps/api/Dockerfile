# better-sqlite3 13은 Node 22 이상이 필요하다 (20에서는 컴파일하다 실패)
FROM node:22-alpine AS base
# 미리 빌드된 파일을 못 받으면 better-sqlite3를 직접 컴파일한다
RUN apk add --no-cache python3 make g++
WORKDIR /app

# 의존성 설치 (워크스페이스 루트 기준)
FROM base AS deps
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
RUN npm ci

# 빌드
FROM base AS builder
# 워크스페이스 안쪽(apps/*/node_modules)에 깔린 패키지도 함께 가져온다
COPY --from=deps /app ./
COPY apps/api/ ./apps/api/
RUN npm run build --workspace=apps/api

# 런타임
FROM base AS runner
ENV NODE_ENV=production

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
RUN npm ci --omit=dev

# 빌드 산출물 (크롤러 data/*.json 포함)
COPY --from=builder /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api
EXPOSE 3001
ENV PORT=3001

CMD ["node", "dist/main.js"]
