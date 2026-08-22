# Runbook — Enable the Missing Pets Feature

This runbook lists the steps to put the pets feature into production. A
human must run the first two steps. `CLAUDE.md` and `docs/architecture.md`
reserve production migrations and the production backend deploy for a
human. This runbook follows the same rule.

## What This Deploys

| Part | Status |
| --- | --- |
| Table `missing_pets` | migration `0001_premium_calypso.sql`, **additive** |
| API `/api/pets/*` | new routes. They do not change any existing route |
| `api/public/pets` | CRUD for integrations (capabilities `pet:*`) |
| "Mascotas" tab in the directory | frontend |
| Dedicated route `/mascotas` | frontend |
| 🐾 layer on the map | frontend |
| "Mascotas" tab in the admin panel | frontend |

## Why the Order Matters (and Why It Is Fault-Tolerant)

The migration runs `CREATE TABLE IF NOT EXISTS` and adds two indexes. **It
does not change any table that production reads right now.** As a result:

- Run the migration BEFORE the deploy: the table stays empty and inactive.
  The old backend does not read it. Cost: zero.
- Deploy the backend BEFORE the migration: `/api/pets/*` returns a 500
  error. The pets tab shows "No pudimos cargar las mascotas" (We could not
  load the pets). **The people directory does not detect the problem.**
  The team confirmed this in staging on 2026-08-10: `/api/missing/stats`
  and `/api/missing` stayed at 200 with the new backend and the old schema.

In short: no order breaks the people directory. The recommended order is
migration → backend → frontend. This order minimizes the time the new tab
is visible but broken.

## 1. Migration (HUMAN)

The migration must target the Neon **direct** endpoint, not the `-pooler`
endpoint. The migration fails on the pooler. `migrate.ts` passes
`lock_timeout` and `statement_timeout` as startup parameters. PgBouncer, in
transaction mode, rejects these parameters.

**The two configs are NOT symmetric** (confirmed on 2026-08-10):

| Config | Variable | Direct? |
| --- | --- | --- |
| `prd` | `NEON_CONNECTION_STRING` | **yes** — this is the variable to use |
| `prd` | `DATABASE_URL` | no, this is the `-pooler` endpoint |
| `stg` | `DATABASE_URL` | no, this is the `-pooler` endpoint — **no direct variable exists** |

In staging, you must derive the direct URL yourself. Remove `-pooler` from
the host name to derive it. `scripts/migrate-direct.sh` does this step for
you. **The script aborts if the resulting host is still the pooler.** The
script never prints the full URL — it prints only the host:

```bash
doppler run --project terremotocolombia-web --config stg --command 'bash scripts/migrate-direct.sh DATABASE_URL'
```

```bash
doppler run --project terremotocolombia-web --config prd --command 'bash scripts/migrate-direct.sh NEON_CONNECTION_STRING'
```

`MIGRATIONS_DIR` is required. The default value is relative to the current
working directory. The script already sets this variable.

The migration is idempotent. It records each run in
`__drizzle_migrations`. You can run the migration again safely. After the
migration, the script also runs `seedAuth`. `seedAuth` seeds four new
capabilities: `pet:read`, `pet:create`, `pet:edit`, and `pet:delete`.
Without this seed, the `api/public/pets` surface returns 403 for every
request. This deny-by-default behavior is the safe failure mode.

Verify the result:

```bash
curl -s https://api.terremotocolombia.co/api/pets/stats
```

The command must return `{"stats":{"total":0,"active":0,"found":0,"onMap":0}}`.
It must not return a 500 error.

**Always verify with a cache-buster** (`?cb=$RANDOM`). Without a
cache-buster, the edge returns a cached copy. You may then reach the wrong
conclusion. During this deploy, a cached `status=all` response made the
people count look wrong (3 vs. 14). The data was correct the whole time.

Note: `stg` **has no `ADMIN_PASSWORD`**. Because of this, `requireAdmin`
rejects every request. You cannot test the moderation endpoints (DELETE,
restore) in `stg`. Test these endpoints locally, with the compose stack,
instead.

## 2. Backend Deploy

**This deploy is manual.** A merge to `main` that changes `backend/**`
does NOT deploy the backend. `deploy-backend.yml` runs only on
`workflow_dispatch`. You must start the workflow yourself:

```bash
gh workflow run deploy-backend.yml --ref main
```

**Merge to `main` BEFORE you dispatch the workflow manually.** The
workflow deploys the ref you dispatch it on. The default ref is `main`. If
you dispatch on a feature ref, and someone else later dispatches on
`main`, the second dispatch overwrites the first. Production then runs
the backend from `main`. If `main` does not yet have your merge,
production runs the old backend. This exact failure happened on
2026-08-10: `/api/pets` returned 404 again, after a deploy that looked
correct. The healthy state is: **`main` matches what runs in
production**, in both tiers.

## 3. Frontend

The frontend **uploads** a Worker version on merge to `main`.
`deploy-frontend.yml` triggers on changes under `frontend/**`. Production
traffic does not change until `promote-frontend.yml` runs with that SHA.

Between the frontend promote and the manual backend promote, a window
exists. In this window, the "Mascotas" tab exists, but `/api/pets` does
not yet exist. Nothing breaks: the tab shows "No pudimos cargar las
mascotas" (We could not load the pets), an honest message. To keep this
window short, promote the backend after the frontend, in the order the
release record names.

## Rollback

- **Frontend**: Promote the previous Worker version with
  `promote-frontend.yml` (or `wrangler versions deploy <id>@100%`).
  Reverting `main` only uploads a new candidate.
- **Backend**: Promote the previous SHA with `deploy-backend.yml`
  `action=promote`.
- **Table**: You do not need to drop the table. With no code to read it,
  the table stays inactive and costs nothing. Run `DROP TABLE
  missing_pets` only if someone decides to abandon the feature. This
  action deletes any existing reports. For this reason, this action is
  the maintainer's decision, not a routine rollback step.

The guarantee that this feature cannot corrupt the people count is
**structural**: the pets table and the people table are separate tables.
Because of this, no people query can return a pet record. Tests enforce
this guarantee in `backend/test/api/pets.test.ts`, under "aislamiento
respecto al directorio de PERSONAS" (isolation from the PEOPLE directory).
