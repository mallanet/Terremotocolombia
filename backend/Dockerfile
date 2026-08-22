# Backend Express (TS). Contexto de build = RAÍZ del repo (necesita backend/ +
# infra/db/schema.ts + packages/contracts via file:../packages/contracts).
#   docker build -f backend/Dockerfile -t mapa-backend .
# Multi-stage: deps -> builder -> runtime no-root.
FROM node:24-slim AS base
WORKDIR /app

# Deps del backend. Se instalan en /app/node_modules (RAÍZ) — NO en /app/backend
# — para que TANTO backend/ COMO infra/db/schema.ts resuelvan drizzle-orm/etc.
# file:../packages/contracts desde /app/package.json apunta a /packages/contracts.
FROM base AS deps
COPY packages/contracts /packages/contracts
COPY backend/package.json backend/package-lock.json* backend/.npmrc ./
RUN npm ci --no-audit --no-fund

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /packages/contracts /packages/contracts
COPY backend ./backend
COPY infra/db ./infra/db
WORKDIR /app/backend
ARG APP_BUILD_SHA=dev
ENV APP_BUILD_SHA=$APP_BUILD_SHA
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
ARG APP_BUILD_SHA=dev
ENV APP_BUILD_SHA=$APP_BUILD_SHA
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /packages/contracts /packages/contracts
COPY --from=builder /app/backend/dist ./backend/dist
COPY backend ./backend
COPY infra/db ./infra/db
COPY config/deployment.config.json ./config/deployment.config.json
WORKDIR /app/backend
EXPOSE 8080
USER node
CMD ["npx", "tsx", "src/server.ts"]
