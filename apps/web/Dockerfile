FROM node:20-alpine AS base
WORKDIR /app

# 의존성 설치 (워크스페이스 루트 기준)
FROM base AS deps
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
RUN npm ci

# 빌드
FROM base AS builder
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY apps/web/ ./apps/web/
# next.config.js의 /api 프록시(rewrites)는 빌드할 때 주소가 굳는다. 실행 때 환경변수로는 안 바뀐다.
ARG API_PROXY_TARGET=http://api:3001
ENV API_PROXY_TARGET=$API_PROXY_TARGET
RUN npm run build --workspace=apps/web

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
