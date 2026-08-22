# Imagen de producción del frontend Next.js (UI).
# Contexto de build = raíz del repo (necesita config/deployment.config.json
# y packages/contracts via file:../packages/contracts).
# Multi-stage: deps -> build (standalone) -> runtime slim no-root.
FROM node:24-slim AS base
WORKDIR /app

# ---- deps: lockfile + local contracts package (mejor cache de capas) ----
FROM base AS deps
COPY packages/contracts /packages/contracts
COPY frontend/package.json frontend/package-lock.json frontend/.npmrc ./
RUN npm ci --no-audit --no-fund

# ---- builder: compila el server standalone ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /packages/contracts /packages/contracts
COPY frontend/ ./
# sync-deployment-config.mjs resuelve ../../config desde /app/scripts → /config
COPY config/deployment.config.json /config/deployment.config.json
ARG APP_BUILD_SHA
ENV APP_BUILD_SHA=$APP_BUILD_SHA
ARG NEXT_PUBLIC_ASSET_PREFIX
ENV NEXT_PUBLIC_ASSET_PREFIX=$NEXT_PUBLIC_ASSET_PREFIX
ARG NEXT_PUBLIC_OPENPANEL_CLIENT_ID
ENV NEXT_PUBLIC_OPENPANEL_CLIENT_ID=$NEXT_PUBLIC_OPENPANEL_CLIENT_ID
ARG NEXT_PUBLIC_OPENPANEL_PRODUCTION_HOST
ENV NEXT_PUBLIC_OPENPANEL_PRODUCTION_HOST=$NEXT_PUBLIC_OPENPANEL_PRODUCTION_HOST
ARG NEXT_PUBLIC_OPENPANEL_DASHBOARD_URL
ENV NEXT_PUBLIC_OPENPANEL_DASHBOARD_URL=$NEXT_PUBLIC_OPENPANEL_DASHBOARD_URL
ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_R2_PUBLIC_BASE
ENV NEXT_PUBLIC_R2_PUBLIC_BASE=$NEXT_PUBLIC_R2_PUBLIC_BASE
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG NEXT_PUBLIC_WHATSAPP_GROUP_URL
ENV NEXT_PUBLIC_WHATSAPP_GROUP_URL=$NEXT_PUBLIC_WHATSAPP_GROUP_URL
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID
ENV NEXT_PUBLIC_GA_MEASUREMENT_ID=$NEXT_PUBLIC_GA_MEASUREMENT_ID
ARG NEXT_PUBLIC_ACOPIO_DEFAULT_COUNTRY
ENV NEXT_PUBLIC_ACOPIO_DEFAULT_COUNTRY=$NEXT_PUBLIC_ACOPIO_DEFAULT_COUNTRY
RUN npm run build

# ---- runtime: slim, no-root ----
FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
