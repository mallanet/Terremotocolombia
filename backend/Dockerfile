# Backend Express (TS). Contexto de build = RAÍZ del repo (necesita backend/ +
# infra/db/schema.ts, que el backend importa con ../../../infra/db/schema.js).
#   docker build -f backend/Dockerfile -t mapa-backend .
# Multi-stage: deps -> builder -> runtime no-root.
FROM node:24-slim AS base
WORKDIR /app

# Deps del backend. Se instalan en /app/node_modules (RAÍZ) — NO en /app/backend
# — para que TANTO backend/ COMO infra/db/schema.ts resuelvan drizzle-orm/etc.
# (Node sube por los directorios padre buscando node_modules; infra/ es hermano
# de backend/, así que necesita el node_modules en el ancestro común /app).
FROM base AS deps
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --no-audit --no-fund

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY backend ./backend
COPY infra/db ./infra/db
WORKDIR /app/backend
# Compila TypeScript. A failed typecheck must fail the image build.
ARG APP_BUILD_SHA=dev
ENV APP_BUILD_SHA=$APP_BUILD_SHA
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
ARG APP_BUILD_SHA=dev
ENV APP_BUILD_SHA=$APP_BUILD_SHA
# node:24-slim trae un usuario no-root `node` (uid 1000). Úsalo.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./backend/dist
COPY backend ./backend
COPY infra/db ./infra/db
# mailer importa config/deployment.config.json (identidad del despliegue).
COPY config/deployment.config.json ./config/deployment.config.json
WORKDIR /app/backend
EXPOSE 8080
# tsx ejecuta TypeScript directo (resuelve el alias @/ del tsconfig del backend).
# tsx está en dependencies (movido de devDependencies) para producción.
USER node
CMD ["npx", "tsx", "src/server.ts"]
