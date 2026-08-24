# Operational schema runners (U8)

These runners change data. They are not Drizzle migrations.

`backend/worker/migrate.ts` wraps each SQL file in one transaction. It
also sets `lock_timeout` to 3s and `statement_timeout` to 60s. A batched
backfill loop cannot live in that path. `CREATE INDEX CONCURRENTLY`
cannot live in that path.

This directory holds checksummed manifests, verification SQL, and the
operator notes. The Node runner is `backend/worker/ops-backfill.ts`.
It does not call `seedAuth()`.

## Safety

- An agent never runs this runner against staging or production Neon
  unless a human has authorized that run in the current session.
- Use the Neon **direct** endpoint. Never use `-pooler`.
- Run **one domain** at a time.
- Run `--mode count-only` first. Read the counts. Then run `--mode apply`.
- This slice **tightens** `organization_id` / `incident_id` to `NOT NULL`
  after a human confirms zero NULL rows. The runner that does that is
  `backend/worker/ops-tighten.ts` (`npm run ops:tighten`). It still does
  **not** call `SET NOT NULL` itself. Journaled `0024_tenant_tighten.sql`
  does. The runner validates CHECKs/FKs and creates tenant-leading indexes
  `CONCURRENTLY`.
- Do **not** backfill `organizations`, `incidents`, or `deployments`
  (catalog / seed). Do **not** backfill `audit_log` here (mixed-scope;
  unknown actions fail closed in a later slice).

## Domains

Target IDs: `org_mallanet` / `inc_terremoto_colombia_2026`.

| Domain | Migration | Notes |
| --- | --- | --- |
| `reports` | `0015` | Composite PK: `report_confirmations (report_id, ip_hash)` |
| `volunteers` | `0016` | |
| `hospitals` | `0017` | |
| `family-search` | `0018` | PKs `missing_person_suppressions.legacy_id`, `person_records.prn` |
| `hub` | `0019` | PK `hub_sync_state.type` |
| `ops` | `0020` | PKs `click_counters.key`, `click_counter_dedup (counter_key, ip_hash)` |
| `campaign` | `0022` | |

Local:

```bash
cd backend
npm run ops:backfill -- --domain reports --mode count-only
npm run ops:backfill -- --domain reports --mode apply
```

Staging (human, Doppler `stg`). `DATABASE_URL` is the pooler.
`scripts/ops-backfill-direct.sh` strips `-pooler` and prints only the host:

```bash
cd /Users/eduardomuthmartinez/Mallanet/Colombia/platform-u8-tighten

doppler run --no-check-version --command 'bash scripts/ops-backfill-direct.sh DATABASE_URL --domain reports --mode count-only --confirm colombia-u8-backfill --operator your-handle'

doppler run --no-check-version --command 'bash scripts/ops-backfill-direct.sh DATABASE_URL --domain reports --mode apply --confirm colombia-u8-backfill --operator your-handle'
```

Replace `reports` with the next domain. After each apply, run the matching
`verify-<domain>-domain.sql`. Every `null_rows` value must be 0. Record the
printed manifest checksum and operator in the execution ledger **after**
that evidence exists.

Do not start the SET NOT NULL tighten from the backfill runner.

## Tighten (KTD6 steps 4-6)

Confirm token: `colombia-u8-tighten`. Neon **direct** only.

```bash
cd backend
npm run ops:tighten -- --domain reports --mode count-only
npm run ops:tighten -- --domain reports --mode apply
```

Staging (human, Doppler `stg`). Strip the pooler:

```bash
doppler run --no-check-version --command 'bash scripts/ops-tighten-direct.sh DATABASE_URL --domain reports --mode count-only --confirm colombia-u8-tighten --operator your-handle'

doppler run --no-check-version --command 'bash scripts/ops-tighten-direct.sh DATABASE_URL --domain reports --mode apply --confirm colombia-u8-tighten --operator your-handle'
```

Then apply `0024_tenant_tighten.sql` with `backend/worker/migrate.ts` against
the same direct endpoint. Verify with `verify-tighten.sql`. Every
`org_not_null` / `incident_not_null` value must be true. `audit_log` stays
nullable.

Colombia production Neon is out of scope for this slice.
