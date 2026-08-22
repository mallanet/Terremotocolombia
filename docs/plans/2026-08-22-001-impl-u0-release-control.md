---
title: U0 Release-control implementation
type: impl
date: 2026-08-22
parent: docs/plans/2026-08-12-001-refactor-multi-incident-platform-plan.md
unit: U0
bootstrap_sha: 83b7c1669fda091f092edcb3f470a1e81f5669ba
status: in-progress
---

# U0 — Release-control prerequisites (implementation)

Parent: [Multi-Incident Platform Migration](./2026-08-12-001-refactor-multi-incident-platform-plan.md).
Ledger: [2026-08-22 execution ledger](./2026-08-22-001-multi-incident-platform-execution-ledger.md).

This sub-plan does not weaken parent safety, tenancy, contract, cache, queue,
offline, migration, rollout, or rollback rules. It implements only U0
(R19, R20, KTD15, KTD17).

## Goal

Every later release identifies the tested source SHA, the uploaded Worker
version, the database capability state, and the rollback target. A push to
`main` must not send production frontend or admin traffic.

## Non-negotiable choices (settled)

1. **Upload is not promotion.** Production frontend and admin workflows run
   `wrangler versions upload` with `--tag $GITHUB_SHA` and
   `--var APP_BUILD_SHA:$GITHUB_SHA`. They do not call `wrangler deploy`.
   They do not purge `sw.js`. They do not smoke production.
2. **Promotion is a separate dispatch.** `promote-frontend.yml`,
   `promote-admin.yml`, and `deploy-backend.yml` with `action=promote`
   call `wrangler versions deploy` for the approved SHA. They do not
   rebuild OpenNext or `tsc` output.
3. **Staging stays automatic.** `deploy-staging.yml` keeps
   `wrangler deploy --env staging` so staging always matches the branch
   tip. It gains `APP_BUILD_SHA`, a schema-capability preflight before the
   API deploy, 7-day `--old-asset-ttl`, and domain smoke that checks served
   SHA.
4. **Build identity is a header, not a public Next API route.** AGENTS.md
   forbids `frontend/app/api/**`. The public site exposes `x-app-build-sha`.
   Admin `/api/health` and backend `/api/healthz` plus `/api/readyz` also
   return `sha`.
5. **Campaign tables join the drift gate now.** `infra/db/schema-campaign.ts`
   is live on `83b7c16` and was invisible to `check-schema-drift.ts`.
   Indexes, `indisvalid`, ownership, and composite FKs stay stubs until
   Phase B (U7/U8), as the parent U0 text allows.
6. **Docker fail-closed lands here. Root-context contracts layout waits for U1.**
   Remove `npm ci || npm install` and the backend `npm run build || echo`
   swallow. Pass `APP_BUILD_SHA`. Do not move the admin Compose context to
   the repository root in this unit.
7. **Old-asset retention.** Staging `wrangler deploy` uses
   `--old-asset-ttl 604800` (7 days). Production promotion uses Gradual
   Versions: assets belong to the version, and Cloudflare keeps prior
   versions (limit 100). `wrangler versions upload` has no `--old-asset-ttl`
   flag (verified against wrangler 4.120 `--help`).
8. **No production dry-run in this PR.** A staging-to-production promotion
   with no user-facing change needs production credentials and explicit
   operator approval. U0 ships the mechanism and a blocker packet.

## Files

- Workflows: `deploy-frontend.yml`, `deploy-admin.yml`, `deploy-backend.yml`,
  `deploy-staging.yml`, `promote-frontend.yml`, `promote-admin.yml`, `ci.yml`
- Identity: `backend/src/lib/build-identity.ts`,
  `backend/src/lib/promote-identity.ts`, `frontend/lib/build-identity.ts`,
  `admin/src/shared/build-identity.ts`
- Schema: `backend/worker/schema-capability.ts`,
  `backend/worker/check-schema-drift.ts`,
  `backend/worker/check-platform-schema.ts`
- Scripts: `scripts/release/*`, `scripts/smoke/domain-smoke.sh`,
  `scripts/compat/*`
- Docker/Compose: three Dockerfiles, `docker-compose.prod.yml`
- Docs: this file, the ledger, `docs/platform/*`, `CLAUDE.md`, `AGENTS.md`,
  `docs/architecture.md`, `docs/deploy-vps.md`

## Test map (parent U0 scenarios)

| Scenario | Mechanism in this unit |
|---|---|
| Refuse to promote SHA B under SHA A's approval | `assertPromoteIdentity` unit test; promote script requires `--version-tag` / tag match |
| Served identifiers equal the approved SHA | health JSON + `x-app-build-sha`; domain-smoke `--expected-sha` |
| Staging schema mismatch stops before Worker deploy | `deploy-staging.yml` runs `check:platform-schema` before `wrangler deploy` |
| Broken backend Docker build fails | Dockerfile has no `\|\| echo`; `assert-docker-fail-closed.sh` + CI job |
| Domain smoke fails while `/api/readyz` is 200 | `evaluateDomainSmoke` unit test + `domain-smoke.sh` |
| Mixed-version lanes | Stored shape fixtures under `scripts/compat/fixtures/`; full Zod lanes wait for U2/U3/U5 |

## Rollback

Revert this PR. Frontend and admin workflows return to immediate
`wrangler deploy` on push. Until that revert, an uploaded-but-not-promoted
version has no production traffic. Rollback of a promoted version is
`wrangler versions deploy <previous-version-id>@100%`.

## Out of scope (do not pull in)

- `packages/contracts` (U1)
- OpenAPI oasdiff (U16)
- Platform repo clone (U6)
- Tenant columns, hostname authority, Upstash (U7+)
- Production promotion, DNS, Doppler, GitHub Environment required reviewers
  (maintainer)
- Operability U23–U33
