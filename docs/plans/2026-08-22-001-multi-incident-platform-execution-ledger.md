---
title: Multi-incident platform execution ledger
date: 2026-08-22
bootstrap_sha: 83b7c1669fda091f092edcb3f470a1e81f5669ba
plan_review_sha: 89089da
cache_review_sha: d106977
status: phase-a-u1-in-progress
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
| Branch | `feat/platform-u1-contracts` (U0 is on `origin/staging` at `4f0cd85`) |
| Immutable bootstrap SHA | `83b7c1669fda091f092edcb3f470a1e81f5669ba` (origin/main, PR #53) |
| User checkout (do not touch) | `/Users/eduardomuthmartinez/Mallanet/Colombia/repo` on `fix/frontend-backend-contracts` (`89089da`) |
| Untracked on user checkout | `.agents/skills/disaster-*`, `.agents/skills/geo/**`, `.agents/skills/neon*` — preserve, do not absorb |
| Plans on origin/main | absent before this unit; copied into the worktree in Phase 0 |
| Do not absorb | `8f12eaa` Access-doc edits and pptx |
| origin/staging | `4414917db386d7559d30a3432aaafce05c78d884` (recorded 2026-08-22) |
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
| Platform GitHub repo | does not exist (U6 needs `gh repo create` authorization) |
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

**Next executable unit:** U1.

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
| Status | in progress on `feat/platform-u1-contracts` |
| Rollback | revert the U1 PR. Production is unchanged until a later promote. |

**Evidence (local, 2026-08-22):**

- Source-form `@mallanet/contracts` with `zod` peer `^3.23.8`
- Envelope tests: 10 passed
- Backend `tsc` consumes the TypeScript source (no `dist/` fallback)
- `wrangler deploy --dry-run` bundle contains `@mallanet/contracts`
- Frontend 40/192, admin 32/172
- Dockerfiles copy `packages/contracts`; admin Compose context is the repository root

### U2–U16 (Phase A remainder)

Not started. U4 follows U1. Do not start U6.

### U6+

Blocked on Phase A and on authorization to create the platform repository,
Doppler/Cloudflare isolation, and a disposable Neon RLS probe.

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

### B2. Platform repository (U6, not now)

- **Missing:** authorization for `gh repo create` under `mallanet`.
- **Do not start U6** before U1–U16 evidence is complete.
