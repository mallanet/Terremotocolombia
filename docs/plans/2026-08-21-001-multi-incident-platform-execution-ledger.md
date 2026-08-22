---
title: Multi-Incident Platform Execution Ledger
date: 2026-08-21
type: execution-ledger
source_repo: https://github.com/mallanet/Terremotocolombia
bootstrap_sha: 83b7c1669fda091f092edcb3f470a1e81f5669ba
bootstrap_ref: origin/main
plan_reviewed_sha: 89089da239154827a3af8ea6b8664111c305efcc
cache_reviewed_sha: d10697765e05fcc16357052007a7757940cd7f99
status: phase-0-complete
next_unit: U0
---

# Multi-Incident Platform Execution Ledger

This ledger is the live map from plan requirement to code, test, evidence, and
rollback. Complete means recorded evidence, not the existence of files.

Authoritative plans:

1. `docs/plans/2026-08-12-001-refactor-multi-incident-platform-plan.md`
2. `docs/plans/2026-08-14-001-feat-platform-operability-plan.md`
3. `docs/plans/2026-08-12-001-refactor-multi-incident-platform-diagrams.md`

## 1. Repository state at Phase 0 (2026-08-21)

Fetched `origin` with `--prune`. No checkout, reset, or stash pop ran.

| Item | Value |
|---|---|
| Dirty checkout branch | `fix/frontend-backend-contracts` |
| Dirty HEAD | `89089da` (Merge pull request #42 from mallanet/staging) |
| Local `main` | `3dacec2` (242 commits behind `origin/main`; ignore it) |
| `origin/main` | `83b7c16` (2026-08-17, Merge PR #53 `feat/campana-brand-icons`) |
| `origin/staging` | `4414917` |
| Distance HEAD...`origin/main` | 0 ahead, 67 behind |
| Platform GitHub repo | absent. Org `mallanet` has no platform repository |
| GitHub Environments | only `copilot`. No production-approval environment |

### Preserved user work (do not absorb)

These files stay in the dirty `fix/frontend-backend-contracts` checkout.
Platform work does not reset, overwrite, or commit them from that branch.

| Path | Kind | Reason |
|---|---|---|
| `CLAUDE.md` | modified | Cloudflare Access Google / account / OTP docs |
| `admin/README.md` | modified | same Access login-method update |
| `docs/architecture.md` | modified | same Access login-method update |
| `docs/runbook-admin.md` | modified | same Access login-method update |
| `docs/plans/2026-08-12-001-refactor-multi-incident-platform-plan.md` | untracked | authoritative base plan |
| `docs/plans/2026-08-14-001-feat-platform-operability-plan.md` | untracked | authoritative operability plan |
| `docs/plans/2026-08-12-001-refactor-multi-incident-platform-diagrams.md` | untracked | diagram pack |
| `docs/presentations/Mallanet-Multi-Incident-Platform-Plan.pptx` | untracked | user presentation |

Stashes on the dirty branch remain untouched:

- `stash@{0}` `codex-pre-origin-main-sync-2026-08-13`
- `stash@{1}` `codex-preserve-unrelated-docs-before-contract-rebase`
- `stash@{2}` superseded family-search docs stash

### Worktrees present (not used for bootstrap)

Existing worktrees point at other branches. Phase A starts from a new
worktree of immutable `origin/main` `83b7c16`. That worktree is not the
dirty `fix/frontend-backend-contracts` checkout.

## 2. SHA reconciliation

The base plan reviewed `89089da`. The cache addendum reviewed `d106977`.
Current `origin/main` is `83b7c16`. `d106977` is an ancestor of `83b7c16`.
`89089da` is also an ancestor of `83b7c16`. The 67 first-parent commits
after `89089da` are live Colombia production history.

Material deltas that change later units:

| Area | What changed on `origin/main` | Units that must absorb it |
|---|---|---|
| Schema | migrations `0010`–`0013` | U7 classification, U8, U18, U27 |
| Official deceased | tables `official_deceased_lists`, `official_deceased_records`; public `/api/deceased`; admin import | U7, U10, U13, U20, U27 |
| Reconstruction campaign | tables `campaign_sites`, `campaign_site_stewards`, `material_pledges`, `material_receipts`, `material_shipments`; public routes; steward middleware | U7, U10, U12, U13, U18 |
| Query observability | `pg_stat_statements` extension only. No application table | U7 notes it as infrastructure, not tenant-scoped |
| Donations | Stripe Checkout DDD module + `ENABLE_STRIPE_DONATIONS`; Payment Links still in `deployment.config.json` | U13/U14 reuse; U15 catalogs the URLs; scope boundary still holds (Stripe holds the money) |
| Edge JSON cache | allowlist adds `/api/deceased`; sampled `edge_cache` logs | U9, U20, U34 |
| Process cache | 24 `cached()` sites; 34 blanket `invalidate()` calls | U34 inventory (was 20 / 34 of 36) |
| Admin | volunteer ficha; campaign models; deceased imports | U11, U13 |
| Family search | `perf/query-family-stability` and missing-route changes | U27 re-inventory |
| Wrangler vars | `ENABLE_STRIPE_DONATIONS=true` in prod and staging | U0 config inventory, U14 |
| Deploy workflows | unchanged vs `89089da` for promotion model | U0 still required |
| Docker | frontend/admin still `npm ci \|\| npm install`; backend still swallows `npm run build` failure | U0/U1 |
| Auth | NULL-org / `is_system` wildcard / `is_super_admin` still live | U30 evidence still valid |
| Contracts package | absent | U1 still required |

Campaign reconstruction is a live domain. R11's module list did not name it.
Treat it as an incident-scoped module in U7/U12/U13.

Official deceased lists are identity-adjacent published records. U27's live
slice includes them. They are not a second matcher.

Stripe Checkout does not store payer rows in Postgres. It creates a Stripe
session and returns a URL. That is still external payment. It is also a
provider adapter that U14 must keep behind a port. Donation Payment Links in
`config/deployment.config.json` remain catalog values for U15.

## 3. Assumption check (still true unless noted)

| Assumption | Status at `83b7c16` |
|---|---|
| Frontend/admin auto-deploy on push to `main` | true. No `APP_BUILD_SHA` in workflows |
| Backend production deploy is manual + schema-drift gate | true. Staging backend has no drift preflight |
| `packages/contracts` does not exist | true |
| Frontend/admin HTTP clients use unchecked `as T` | true |
| Tenant resolver does not exist | true. Express `trust proxy` remains `true` |
| Process cache is a 500-entry Map with unbounded SWR | true (`backend/src/lib/cache.ts`) |
| Blanket `invalidate()` still exists | true (34 call sites) |
| Queue worker (BullMQ) not deployed to Cloudflare | true |
| Hyperdrive/D1 unused | not re-opened |
| `workers_dev` routes still a U9 concern | confirm in U9 against live wrangler files |
| No platform repo | true. U6 needs an authorized new GitHub repository |
| Operability entry gate | not met. U21/U22 incomplete. No named second-incident driver |

## 4. Dependency graph and next executable unit

```text
U0
 └─ U1
     ├─ U4 ─┬─ U2 ─┐
     │      └─ U3 ─┼─ U16 ─ U6 ─ U19 ─ U7 ─ U9 ─ U20 ─ U34
     └─ U5 ────────┘                         │      │
                                             U18 ───┘
                                               │
                                              U8 ─ U10 ─ U11
                                                      │
                                      U12 ─ U13 ─ U14
                                       │
                                      U15
                                       │
                         U17 ← U10+U16
                         U27 ← U7,U9–U12,U15,U18,U20
                         U35 ← U3,U10–U15,U18,U20 (shadow only until U29–U32)
                         U21 ← U11,U12,U17,U19,U20,U27,U34 + enabled domains
                         U22 ← U21
                         U23–U33 PARKED until U21+U22 and a named second incident
```

**Next executable unit: U0** in this Colombia repository, from immutable
`origin/main` `83b7c16`, on a new branch/worktree. Do not start U0 in
`fix/frontend-backend-contracts`.

## 5. Unit ledger

Status values: `not-started` | `in-progress` | `blocked` | `evidence-complete`.

### Phase A — this repo

| U | R / KTD | Status | Files | Tests / evidence | Artifact | Rollback | Blocker |
|---|---|---|---|---|---|---|---|
| U0 | R19, R20; KTD17 | not-started | deploy workflows, Dockerfiles, compose, build identity, smoke scripts, release-record template, schema-capability stub | workflow SHA-mismatch refuse; served build id; Docker fail-closed; domain smoke vs `/readyz`; mixed-version lanes | SHA `83b7c16` + later PR | previous workflows + previous Worker versions | GitHub production environments with required reviewers do not exist. Promotion can still use `workflow_dispatch` with explicit version ID. Creating protected environments needs maintainer approval |
| U1 | R1; KTD1, KTD2 | not-started | `packages/contracts`, app manifests, three Dockerfiles, three Compose files, path filters | typecheck/build; wrangler dry-run; root-context images; `npm ci` fail-closed | — | remove package + restore Docker/Compose | none |
| U4 | R2; KTD4 | not-started | `packages/contracts/src/validate.ts`, frontend/admin HTTP | report/enforce unit tests; no PII in telemetry | — | flag off | U1 |
| U2 | R2–R5 | not-started | reports contracts + backend/frontend | AE1; wire payload snapshot | — | additive backend first | U4 |
| U3 | R2–R5 | not-started | needs/jobs contracts | AE2; both queue transports | — | additive backend first | U4 |
| U5 | R4, R5; KTD3 | not-started | envelopes + admin adapter | admin Ok/Err; legacy shapes | — | unused adapter | U1 |
| U16 | R16; KTD11 | not-started | OpenAPI + oasdiff CI | breaking fixture fails; additive passes | — | drop CI job | U2, U3, U5 |

### Phase B — platform repo after U6

| U | Status | Notes |
|---|---|---|
| U6 | blocked (later) | Needs authorized new GitHub repository, Doppler/Cloudflare isolation, disposable Neon branch for RLS probe |
| U19 | not-started | Starts at U6 bootstrap SHA `83b7c16` unless a later fetch moves HEAD before clone |
| U7 | not-started | Classification must include campaign + official deceased + every table at bootstrap SHA |
| U9 | not-started | Authority before JSON/photo cache. Allowlist now includes `/api/deceased` |
| U20 | not-started | Inventory must include campaign, deceased, donations checkout, volunteer ficha |
| U34 | not-started | Re-inventory at execution: 24 `cached()` sites; 34 blanket `invalidate()`. Upstash resources need spending approval |
| U18 | not-started | Per domain after U20 |
| U8 | not-started | Expand/backfill/tighten. Production migrate remains human-gated |
| U10 | not-started | Isolation suite required from this unit |
| U11 | not-started | Include volunteer analytics + volunteer ficha |

### Phases C–E

| U | Status | Notes |
|---|---|---|
| U12 | not-started | Campaign and deceased join the registry |
| U13 | not-started | Donations module already follows DDD. Extract remaining domains one at a time. Add campaign as its own sub-plan |
| U14 | not-started | Stripe Checkout adapter already exists. Keep the disabled gateway |
| U15 | not-started | Include `donationUrl` / `donationMonthlyUrl` |
| U35 | not-started | Shadow mode only until U29–U32. Not a U21 gate |
| U27 | not-started | Add official deceased to the identity slice inventory |
| U17 | not-started | After U10 + U16 |

### Phase F

| U | Status | Notes |
|---|---|---|
| U21 | not-started | Production promotion and DNS need explicit user approval |
| U22 | not-started | After rollback window |

### Operability plan (parked)

Entry gate is not satisfied:

1. U21 and U22 are not complete.
2. No named second-incident driver (committed incident, timeline, or funding).

U23–U26 and U28–U33 stay parked. Isolation tests in U10 may seed two
synthetic organizations. That is not public second-incident activation.

## 6. Live table set at `83b7c16` (U7 input)

From `infra/db/schema.ts` and `infra/db/schema-campaign.ts`. Classification
is not started. This list is the mechanical inventory.

**Operational / likely tenant-scoped (review in U7):**
`reports`, `report_confirmations`, `missing_persons`,
`missing_person_suppressions`, `official_deceased_lists`,
`official_deceased_records`, `missing_pets`, `chat_messages`, `hospitals`,
`hospital_patients`, `patient_imports`, `patient_import_rows`,
`ocr_corrections`, `hospital_supply_statuses`, `hospital_supply_needs`,
`hospital_supply_help_requests`, `hospital_poc_assignments`,
`hospital_supply_events`, `donations`, `click_counters`,
`click_counter_dedup`, `contact_messages`, `volunteers`,
`volunteer_checkins`, `volunteer_tasks`, `volunteer_assignments`,
`data_deletion_requests`, `analytics_events`, `damage_candidates`,
`unidentified_persons`, `hub_missing_persons`, `hub_checkins`,
`hub_help_requests`, `hub_help_offers`, `hub_damaged_buildings`,
`failed_submissions`, `campaign_sites`, `campaign_site_stewards`,
`material_pledges`, `material_receipts`, `material_shipments`.

**Identity overlay (U27 slice, likely tenant-scoped):**
`person_records`, `person_links`, `person_link_decisions`,
`person_clusters`, `person_cluster_members`, `record_status_signals`.

**Auth (U30 conversion; do not treat NULL as global forever):**
`capabilities` (global catalog), `roles`, `role_capabilities`, `users`,
`permission_grants`, `invitations`, `password_resets`, `api_keys`,
`hub_credentials`.

**Mixed / global candidates (KTD10):**
`audit_log` (mixed-scope), `earthquakes` (global evidence),
`geocode_cache` (namespace required), `sync_state`, `sync_runs`,
`hub_sync_state`.

**Infrastructure, not an application table:** `pg_stat_statements`.

## 7. Verification contract progress

No Phase A command has run against `83b7c16` in this execution yet. Each
unit records its commands when it claims complete.

## 8. Known later blockers (not U0)

| When | Missing authorization | Why | Prepared action |
|---|---|---|---|
| U0 merge to `main` | GitHub Environment required reviewers (optional but stronger) | Prevent unapproved production promotion | Ask maintainer to create `production-frontend`, `production-admin`, `production-backend` with required reviewers. Workflows can use `workflow_dispatch` until then |
| U6 | Create GitHub platform repository under `mallanet` | KD1/KTD16 | `gh repo create mallanet/<name> --private` after name approval |
| U6 | Isolated Doppler config, Cloudflare account resources, staging/canary Worker names | Must not own Colombia production before U21 | Operator packet |
| U8/U21 | Neon direct-endpoint migrate / anonymized branch | Human-gated; production data | Operator packet |
| U34 | Upstash databases and spend | Billable | Operator packet |
| U21 | Production promotion, DNS, Worker cutover | Explicit user approval required | Operator packet + rollback drill |
| Operability | Named second-incident driver | Entry gate | Park until named |

## 9. Decision log

| Date | Decision | Source |
|---|---|---|
| 2026-08-21 | Bootstrap SHA is `83b7c16` (`origin/main` at fetch). Not `89089da`. Not the dirty branch | KTD16 / U19 / Phase 0 |
| 2026-08-21 | Preserve dirty Access docs and the pptx. Do not fold them into platform PRs | user-owned work rule |
| 2026-08-21 | Campaign and official deceased join the platform classification and module list | origin/main invalidates R11 completeness |
| 2026-08-21 | Stripe Checkout stays an external payment adapter. It is not Mallanet money movement | live donations module + original scope boundary |
| 2026-08-21 | Operability units stay parked until U21, U22, and a named second-incident driver | operability plan entry gate |
| 2026-08-21 | U35 participant-facing automation stays off until its safety gates | R69 / KTD66 |

## 10. Checkpoint

Phase 0 is complete. Next: U0 on a clean worktree of `83b7c16`.
