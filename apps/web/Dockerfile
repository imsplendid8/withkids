# better-sqlite3 13은 Node 22 이상이 필요하다 (20에서는 컴파일하다 실패)
FROM node:22-alpine AS base
# 미리 빌드된 파일을 못 받으면 better-sqlite3를 직접 컴파일한다
RUN apk add --no-cache python3 make g++
WORKDIR /app

# 의존성 설치 (워크스페이스 루트 기준)
FROM base AS deps
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
RUN npm ci

# 빌드
FROM base AS builder
# 워크스페이스 안쪽(apps/*/node_modules)에 깔린 패키지도 함께 가져온다
COPY --from=deps /app ./
COPY apps/web/ ./apps/web/
# next.config.js의 /api 프록시(rewrites)는 빌드할 때 주소가 굳는다. 실행 때 환경변수로는 안 바뀐다.
ARG API_PROXY_TARGET=http://api:3001
ENV API_PROXY_TARGET=$API_PROXY_TARGET
# public 폴더는 저장소에 없을 수 있다 (수집 데이터는 커밋하지 않음)
RUN mkdir -p apps/web/public && npm run build --workspace=apps/web

# 런타임 (standalone 출력물만 실행)
FROM base AS runner
ENV NODE_ENV=production

# standalone에는 필요한 node_modules가 이미 포함되어 있다.
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/web/server.js"]
