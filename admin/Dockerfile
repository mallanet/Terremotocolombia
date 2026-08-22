# Imagen de producción del panel admin (Next.js standalone).
# Contexto de build = raíz del repo (necesita packages/contracts).
#   docker build -f admin/Dockerfile -t mapa-admin .
# Multi-stage: deps → builder → runtime no-root.
# Node >=24 (engines en package.json).

FROM node:24-slim AS base
WORKDIR /app

FROM base AS deps
COPY packages/contracts /packages/contracts
COPY admin/package.json admin/package-lock.json admin/.npmrc ./
RUN npm ci --no-audit --no-fund

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /packages/contracts /packages/contracts
COPY admin ./
RUN mkdir -p /app/public
ENV NEXT_TELEMETRY_DISABLED=1
ARG APP_BUILD_SHA
ENV APP_BUILD_SHA=$APP_BUILD_SHA
RUN npm run build

FROM node:24-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node
EXPOSE 3000
CMD ["node", "server.js"]
