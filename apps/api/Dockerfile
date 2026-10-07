FROM node:20-alpine AS base
WORKDIR /app

# 의존성 설치 (워크스페이스 루트 기준)
FROM base AS deps
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
RUN npm ci

# 빌드
FROM base AS builder
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
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
