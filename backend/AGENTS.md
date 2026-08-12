# AGENTS.md — backend map

**Parent map:** `../AGENTS.md`

## Scope

This package runs the Express 5 API. It handles database access through
Drizzle, authentication, integrations, and BullMQ workers. This package
shares the schema in `../infra/db/`.

## Where to look

| Task | Location | Notes |
|------|----------|-------|
| Server composition | `src/server.ts` | Mounts routers and modules |
| Public-site routes | `src/routes/` | A mutation needs an approved guard |
| Authenticated API | `src/public-api/` | Gated by capability. CRUD uses a resource config |
| Business logic | `src/services/` | Keep route handlers thin |
| External integrations | `src/modules/` | DDD layers. The composition root reads `env` |
| Auth / RBAC | `src/auth/`, `src/middleware/` | JWT, API keys, and capabilities |
| Database adapter | `src/db/` | Import `getDb`, `hasDbEnv`, `schema` here |
| Caching / rate limit | `src/lib/cache.ts`, `src/lib/rate-limit.ts` | Preserve operational limits |
| Workers / queues | `worker/` | Long-running work runs here |
| Tests | `test/`, `eslint-rules/` | Integration tests need Postgres and Valkey |

## Done (local)

See the `Useful commands` section in the root `AGENTS.md`, under `backend`,
for the lint, typecheck, and build commands. A worker change also needs the
worker `tsconfig` check. Before you ship a change, also run `npm run build`.

## Hard stops (this package)

- Every route under `src/routes/`, `src/public-api/`, or `src/modules/` uses
  `rateLimit({ scope, limit })`. This rule does not apply to server health
  and readiness endpoints.
- `src/public-api/*` uses capabilities and never Turnstile.
- Public mutations in `src/routes/*` use Turnstile or an approved gate.
- Ordinary database access uses Drizzle. Do not create tables at API
  runtime.
- Never store a raw IP address. Use `clientIp()` and `hashIp()` instead.
- Never expose patient staging fields, credentials, or full input objects.

## Ask first

Ask a maintainer before you take these actions:

- Change the schema, run a migration or backfill, or start patient bulk
  ingestion.
- Purge a queue.
- Change a capability, RBAC rule, public contract, rate limit, or cache
  behavior.

## Manual notes

<!-- Preserved on refresh -->
