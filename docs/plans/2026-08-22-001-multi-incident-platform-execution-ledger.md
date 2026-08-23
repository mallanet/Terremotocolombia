---
title: Multi-incident platform execution ledger
date: 2026-08-22
bootstrap_sha: 83b7c1669fda091f092edcb3f470a1e81f5669ba
plan_review_sha: 89089da
cache_review_sha: d106977
status: phase-b-u7-on-colombia-staging
supersedes: docs/plans/2026-08-21-001-multi-incident-platform-execution-ledger.md
---

# Multi-incident platform execution ledger

Authoritative plans:

1. `docs/plans/2026-08-12-001-refactor-multi-incident-platform-plan.md`
2. `docs/plans/2026-08-14-001-feat-platform-operability-plan.md`
3. `docs/plans/2026-08-12-001-refactor-multi-incident-platform-diagrams.md`

This ledger maps requirement → KTD → unit → files → tests → evidence → SHA →
status. Complete means acceptance evidence, not the existence of files.

## Phase 0 — repository reality (2026-08-22)

| Item | Value |
|---|---|
| Implementation worktree | `/Users/eduardomuthmartinez/Mallanet/Colombia/platform-impl` |
| Branch | `feat/platform-u7-staging-expand` (U7 schema onto Colombia `staging`) |
| Immutable bootstrap SHA | `83b7c1669fda091f092edcb3f470a1e81f5669ba` (origin/main, PR #53) |
| User checkout (do not touch) | `/Users/eduardomuthmartinez/Mallanet/Colombia/repo` on `fix/frontend-backend-contracts` (`89089da`) |
| Untracked on user checkout | `.agents/skills/disaster-*`, `.agents/skills/geo/**`, `.agents/skills/neon*` — preserve, do not absorb |
| Plans on origin/main | absent before this unit; copied into the worktree in Phase 0 |
| Do not absorb | `8f12eaa` Access-doc edits and pptx |
| origin/staging | `e1a8d0b` Merge PR #62 (U7 isolated-Neon ledger). Recorded 2026-08-23 |
| Local `main` | stale (`3dacec2`, 242 behind). Ignore. |
| Plan original review SHA | `89089da` (ancestor of main) |
| Cache addendum SHA | `d106977` (ancestor of main) |
| `89089da..origin/main` | 67 commits total, **10 first-parent** (not 67 first-parent) |

First-parent since `89089da`: map cleanup (#15), chip (#43), volunteer ficha (#44),
staging observability (#46), query-family (#49), donate (#50), stripe audit (#51),
campaign reconstrucción (#47+#52), brand icons (#53).

### Live audit at `83b7c16` (material to later units)

| Assumption | Status |
|---|---|
| `packages/contracts` | absent |
| Workflows set `APP_BUILD_SHA` | no (Next configs already read it) |
| Frontend/admin Docker | `npm ci \|\| npm install` |
| Backend Docker | `npm run build \|\| echo ...` swallows `tsc` failure |
| HTTP clients | `as T` in frontend and admin |
| `trust proxy` | `true` in `server.ts` (U9) |
| `workers_dev` | unset → Cloudflare default **true** (U9 must set false) |
| Process cache | 24 `cached()` sites, 35 `invalidate()` call sites |
| JSON edge allowlist | includes `/api/deceased` |
| Prod frontend/admin | automatic `wrangler deploy` on push; smoke is HTTP 200 only |
| Prod backend | manual dispatch + column drift **before** deploy |
| Staging backend | no drift preflight |
| Compose prod | `backend`/`worker` `depends_on: migrate` |
| Auth | NULL-org / `is_system` wildcard / `is_super_admin` (U30, parked) |
| Drift gate schema import | `schema.ts` only — **misses campaign tables** |
| Platform GitHub repo | interim `Emuthmartinez/platform` from `83b7c16`; intended `mallanet/platform` (B2 transfer) |
| GitHub Environments with required reviewers | only `copilot`; production-* do not exist yet |

Operability U23–U33 remain **parked**: U21/U22 are incomplete and no second-incident
driver is named.

## Dependency graph (executable)

```
U0 → U1 → U4 → U2, U3; U1 → U5; U2+U3+U5 → U16 → U6 → U19 → U7 → U9 → U20 → U34
                                                              ↘ U18 → U8 → U10 → U11 → U12…
U23–U33 PARKED until U21+U22 and a named second-incident driver
U35 starts deterministic shadow; not a U21 gate
```

**Next executable unit:** U9 in `Emuthmartinez/platform` (trusted hostname
→ `deployments`, `workers_dev: false`). Do not merge Colombia `staging` to
`main` to copy Phase A. U19 imports from Colombia `origin/main` after those
commits land there. Do not copy Colombia Doppler tokens onto the platform
repo. Do not deploy the platform clone onto terremotocolombia.co Workers.

## Unit ledger

### U0 — Release-control prerequisites

| Field | Value |
|---|---|
| Requirements | R19, R20 |
| KTDs | KTD15, KTD17 |
| Depends on | none |
| Source SHA | `83b7c16` |
| Status | staging evidence complete; production dry-run blocked (B0) |
| Rollback | revert the U0 PR; uploaded Worker versions have no traffic until promote. After promote: `wrangler versions deploy <previous-id>@100%` |
| Blocker | B0 staging-to-production dry run; B1 GitHub Environment required reviewers |
| PR/commit | [PR #54](https://github.com/mallanet/Terremotocolombia/pull/54) merged to `staging` as `4f0cd85` |

**Evidence (2026-08-22, staging):**

- GitHub Actions `deploy-staging.yml` run `32578744556` on merge of #54: schema-capability gate **before** API `wrangler deploy --env staging`; frontend and admin deploys; domain smoke including served SHA. Conclusion: **success**.
- Production traffic was not changed. Promote workflows were not run.

**Evidence (2026-08-22, worktree):**

- SHA mismatch refuse: `backend/test/lib/promote-identity.test.ts`
- Domain smoke vs healthy readyz: same file `evaluateDomainSmoke`
- Campaign tables in drift inventory: `backend/test/lib/schema-capability.test.ts`
- Docker fail-closed: `scripts/release/assert-docker-fail-closed.sh` + `backend/test/lib/docker-fail-closed.test.ts`
- Mixed-version shape fixtures: `node scripts/compat/check-fixtures.mjs`
- Served identity: health JSON + `x-app-build-sha` (`request-context.test.ts`, admin health tests)
- Backend: lint, typecheck, worker tsc, `npm test` 80 files / 767 tests
- Frontend: lint (existing warnings only), typecheck, `npm test` 39 files / 189 tests
- Admin: lint, typecheck, `npm test` 32 files / 172 tests
- Production dry-run: **not run** (B0)

### U1 — Contracts package scaffold and distribution proof

| Field | Value |
|---|---|
| Requirements | R1 |
| KTDs | KTD1, KTD2 |
| Depends on | U0 |
| Status | merged to `staging` as `8cf24e6` (PR #55) |
| Rollback | revert the U1 PR. Production is unchanged until a later promote. |

**Evidence (local, 2026-08-22):**

- Source-form `@mallanet/contracts` with `zod` peer `^3.23.8`
- Envelope tests: 10 passed
- Backend `tsc` consumes the TypeScript source (no `dist/` fallback)
- `wrangler deploy --dry-run` bundle contains `@mallanet/contracts`
- Frontend 40/192, admin 32/172
- CI on PR #55: all jobs green after `install-links=true` (copy, not symlink)
- Merged to `staging` as `8cf24e6`

### U4 — Validation telemetry and enforce flag

| Field | Value |
|---|---|
| Requirements | R2 |
| KTDs | KTD4 |
| Depends on | U1 |
| Status | merged to `staging` as `297306e` (PR #56) |
| Rollback | revert the U4 PR. Production stays on report mode. |

**Evidence (2026-08-22):**

- `validateContract` / `readContract` never cast `raw` to T
- Production defaults to report; development/test always enforce
- Frontend mismatch events reuse `client_error` with endpoint + issue paths only
- CI on PR #56: all jobs green
- Merged to `staging` as `297306e`

### U5 — Envelope canon and admin adapter

| Field | Value |
|---|---|
| Requirements | R4, R5 |
| KTDs | KTD3 |
| Depends on | U1 |
| Status | merged to `staging` as `1df8361` (PR #57) |
| Rollback | revert the U5 PR. No live admin call site opts into `schema` yet. |

**Evidence (2026-08-22):**

- Named list shapes in `packages/contracts/README.md`
- `hospitalsBareListSchema` for `GET /api/hospitals`
- `readAdminResult` never throws; live BFF call sites stay opt-in
- CI on PR #57: all jobs green
- Merged to `staging` as `1df8361`

### U2 — Reports contracts (additive)

| Field | Value |
|---|---|
| Requirements | R1, R4, R5 |
| KTDs | KTD1 |
| Depends on | U4 |
| Status | merged to `staging` as `6df6207` (PR #58) |
| Rollback | revert the U2 PR. Wire JSON is unchanged. |

**Evidence (2026-08-22):**

- `packages/contracts/src/reports.ts` matches live list/create/detail/confirm JSON
- Frontend `readReportsList` uses report mode; missing `totalPages` defaults to 1
- GET bodies have no `editToken`
- CI on PR #58: all jobs green
- Merged to `staging` as `6df6207`

### U3 — Needs async-job envelope (additive)

| Field | Value |
|---|---|
| Requirements | R1, R4, R5 |
| KTDs | KTD3 |
| Depends on | U4 |
| Status | merged to `staging` as `90bc30d` (PR #59) |
| Rollback | revert the U3 PR. Wire JSON is unchanged. Disabled `/api/needs` stays a generic 404. |

**Evidence (2026-08-22):**

- POST 202 and GET status parse through shared contracts
- Frontend poll fails closed on a mismatch
- Public `result` rejects extra citizen fields
- CI on PR #59: all jobs green
- Merged to `staging` as `90bc30d`

### U16 — OpenAPI baseline and oasdiff CI gate

| Field | Value |
|---|---|
| Requirements | R16 |
| KTDs | KTD11 |
| Depends on | U2, U3, U5 |
| Status | merged to `staging` as `33ef83e` (PR #60) |
| Rollback | revert the U16 PR. Runtime `/api/docs` stays gated by `ENABLE_API_DOCS`. |

**Evidence (2026-08-22):**

- Hybrid generator: JSDoc + crud-factory + contract overlay
- `cd backend && npm run openapi:generate` → `docs/api/openapi.json`
- Coverage: 136 paths (10 `contracts`, 66 `legacy-crud`, 60 `legacy-jsdoc`)
- Overlay paths stay `contracts`: healthz/readyz, public reports, `/api/needs*`
- oasdiff v1.29.1; gate `oasdiff breaking --fail-on WARN`
- CI job `contract compatibility (OpenAPI + oasdiff)` green on PR #60
- Merged to `staging` as `33ef83e`

This gate is **not** on Colombia `origin/main` (`83b7c16`). It reaches the
platform clone only through U19 after Phase A commits land on Colombia `main`.

### U6 — Platform repo bootstrap

| Field | Value |
|---|---|
| Requirements | R6; instantiates KD1 |
| KTDs | KD1, KTD5 |
| Depends on | U2, U3, U5, U16 |
| Status | clone complete on interim personal repo; org transfer still open (B2) |
| Rollback | delete or archive `Emuthmartinez/platform`; Colombia production is unchanged |

**Evidence (2026-08-23):**

- `gh repo create mallanet/platform` failed: `Emuthmartinez cannot create a repository for mallanet`
- User approved create under `Emuthmartinez`. Repo:
  https://github.com/Emuthmartinez/platform
- Clone SHA: Colombia `origin/main` `83b7c1669fda091f092edcb3f470a1e81f5669ba`
- Isolation commit `5934084`: deploy/monitor/verify-jobs are dispatch-only and
  skip unless `vars.ENABLE_PLATFORM_DEPLOYS == 'true'`. No Colombia Doppler
  tokens on the clone. GitHub Actions was disabled until that commit was on
  `main`, then re-enabled for CI.
- drizzle-kit `0.31.10` in its own commit `0babcfb`. `drizzle-kit generate`
  reported no schema changes.
- RLS probe on disposable Neon branch `u6-rls-probe`
  (`br-noisy-hill-axwaks2j`, parent staging, expires 2026-08-24T02:00:00Z).
  Synthetic table only. Record:
  https://github.com/Emuthmartinez/platform/blob/main/docs/platform/rls-feasibility.md
- KTD5 stands: app-level enforcement. Neon owner has `BYPASSRLS`. FORCE RLS
  does not bind that owner. A non-owner runtime role plus one HTTP `neon()`
  batch can isolate tenants.
- Probe table and role dropped after the record. Branch still expires.
- Platform HEAD after U6 commits: `1e7f019`
- Isolated Neon project `mallanet-platform` (`hidden-cell-49890973`), empty
  of crisis data. Doppler project `mallanet-platform` in the Furbo workplace:
  `stg`/`dev` hold `DATABASE_URL`; `prd` has no database URL. Clone migrations
  applied on that branch. Read-only `DOPPLER_TOKEN` / `DOPPLER_TOKEN_STAGING`
  set on `Emuthmartinez/platform` for CI. `ENABLE_PLATFORM_DEPLOYS` unset.

**Not claimed (plan verification, deferred):**

- OpenAPI oasdiff CI on the platform clone (not on bootstrap SHA)
- Staging deploy of three apps **from the platform repo** (would overwrite
  Colombia staging Workers). Colombia staging stays on this repo. U7 schema
  on Colombia staging is a copy of the expand SQL, not a Worker cutover.

### U7 — Platform core schema (expand)

| Field | Value |
|---|---|
| Requirements | R6, R7, R10 |
| KTDs | KTD6, KTD7, KTD10, KTD14 |
| Depends on | U6 |
| Status | expand merged on platform `main`; applied on Colombia staging Neon; production Neon untouched |
| Rollback | revert the Colombia staging PR; drop isolated Neon project if abandoning the clone. Do not roll back staging SQL without a matching code revert. |
| PR/commit | [platform PR #1](https://github.com/Emuthmartinez/platform/pull/1) merged `93188d4`; Colombia staging PR follows |

**Evidence (2026-08-23, isolated Neon `hidden-cell-49890973`):**

- Classification artifact `docs/platform/table-classification.json`: 65
  Drizzle tables (including campaign). CI step
  `npm run check:table-classification`.
- `0014_platform_core`: `organizations`, `incidents` unique
  `(organization_id, id)`, `deployments` hostname PK + composite FK. Seed
  hostnames match `config/deployment.config.json`. Mixed org/incident pair
  rejected (`platform-core-tenants.test.ts`).
- Domain-group expands `0015`–`0022`: nullable `organization_id` /
  `incident_id`, composite FKs `NOT VALID`. `audit_log` mixed-scope CHECK.
  Campaign expand is handwritten SQL (tables stay out of drizzle-kit
  generate).
- Drift after apply: 65 tables, 764 columns, OK.
- `drizzle-kit generate` empty after the sequence.
- Journal: 23 migrations, unique increasing `when`.
- Platform PR #1 merged to `Emuthmartinez/platform` `main` as `93188d4`
  (merge commit, expand history kept).

**Evidence (2026-08-23, Colombia staging Neon `br-shy-king-ax96do57`):**

- Same expand SQL applied **before** schema code merge (migrate-first).
- `__drizzle_migrations` count: 23. Seed: `org_mallanet` /
  `inc_terremoto_colombia_2026` plus the three production hostnames from
  `config/deployment.config.json`.
- Production branch `br-nameless-dew-axx1c59w`: `organizations` absent.
- Current staging Workers still run pre-U7 code. Extra nullable columns do
  not change those SELECTs. Merge of this PR deploys schema-aware code
  against columns that already exist. Capability gate must pass.

**Not claimed:**

- Dual-write (U18), backfill/tighten (U8), tenant resolver (U9)
- Apply on Colombia production Neon
- Staging hostnames in `deployments` (`staging.terremotocolombia.co` and
  api/admin staging). Add them before U9 is tested on Colombia staging.

## Blocker packets (open)

### B0. Production promotion dry-run (U0 verification)

- **Missing:** explicit approval to run `promote-*` / backend promote against
  production with no intended user-facing change.
- **Why:** CLAUDE.md forbids production deploys, DNS, and secret changes on
  agent initiative. The parent U0 verification asks for one dry run.
- **Prepared:** upload/promote workflows, domain-smoke, release-record template.
- **Risk if skipped:** mechanism is tested in unit tests and staging after
  merge; production identity wiring is proven only at first real promote.
- **First command after approval:**
  `gh workflow run deploy-frontend.yml --ref main` then
  `gh workflow run promote-frontend.yml -f source_sha=<that SHA>`
  (operator confirms served SHA, then rolls back if this was only a drill).

### B1. GitHub Environment required reviewers (U0 optional-stronger)

- **Missing:** maintainer configures `production-frontend`, `production-admin`,
  `production-backend` with required reviewers.
- **Why:** KTD17 wants environment approval. Dispatch is the interim human gate.
- **Prepared:** workflows already declare those environment names.
- **First action:** GitHub → Settings → Environments → required reviewers.

### B2. Platform repository org home

- **Interim:** https://github.com/Emuthmartinez/platform exists and is isolated.
- **Missing:** an org owner creates or transfers `mallanet/platform`.
- **Do not** copy Colombia `DOPPLER_TOKEN` / Cloudflare tokens onto the clone.
- **Do not** set `ENABLE_PLATFORM_DEPLOYS` until isolated Workers exist.
