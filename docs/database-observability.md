# Database observability runbook

This runbook measures why Postgres uses compute. It does not change application
data. It does not permit an agent to migrate production.

## Signals

The system uses three signal sources:

1. Neon Monitoring shows compute size, CPU, memory, connections, working set,
   and Local File Cache behavior.
2. `pg_stat_statements` attributes database time to normalized statements.
3. Workers Logs correlate HTTP routes, Cron runs, and Queue batches with time.

The API emits a structured `access` record when one of these conditions is
true:

- The response is a 5xx response.
- The request takes at least 500 ms.
- Postgres takes at least 250 ms in the request.
- A database call retries or fails.
- The request is in the one-percent routine sample.

The record contains `route`, `status`, `dur_ms`, `db_queries`, `db_ms`,
`db_retries`, and `db_failures`. It contains no SQL, bind values, body fields,
raw IP address, or application record ID.

Every Cron run emits `t=cron_run`, its fixed schedule, outcome, and duration.
Every Queue invocation emits `t=queue_batch`, a bounded queue kind, outcome,
batch size, and duration. Queue logs do not contain message bodies or IDs.
One percent of anonymous public JSON cache decisions emits `t=edge_cache`, a
bounded resource family, and one of `hit`, `miss_fill`, or `miss_uncacheable`.
It does not include a URL, query string, Origin, cache key, or record ID.

## Enable query statistics

Migration `0011_query_observability` installs `pg_stat_statements`. Follow the
normal staging-first migration procedure. A human must run each command.

```bash
doppler run --project terremotocolombia-web --config stg \
  --command 'bash scripts/migrate-direct.sh DATABASE_URL'
```

Verify staging before production. Then use the production variable selected by
the production migration procedure. The script removes `-pooler` and prints
only the destination host.

```bash
doppler run --project terremotocolombia-web --config prd \
  --command 'bash scripts/migrate-direct.sh NEON_CONNECTION_STRING'
```

Do not run `pg_dump`, migrations, or extension commands through the pooled
endpoint.

## Capture the baseline

Run the report after the migration. The default report does not print SQL.

```bash
cd backend
doppler run --project terremotocolombia-web --config stg \
  --command 'npm run observe:db -- --top=30'
```

Use `--include-sql` only in a private terminal when you must map a normalized
statement to source code. Do not paste that output into a public issue or log.

Capture these values each day for seven days:

- Compute Unit hours and projected monthly Compute Unit hours.
- Time at the configured maximum compute size.
- CPU p50, p95, and p99.
- Active and pooled client/server connections.
- Local File Cache hit rate and working-set size.
- Top statements by total execution time, call count, and mean time.
- Sequential scans, index scans, live rows, dead rows, and relation size.
- HTTP p95 and p99 by route.
- `db_ms`, `db_queries`, retries, and failures by route.
- Cron and Queue duration by bounded operation kind.
- Cloudflare JSON edge-cache hit and origin-miss ratio for public polling paths.

Do not reset `pg_stat_statements` during this first baseline. The report prints
`stats_reset`, which defines the start of the sample.

## Initial alert policy

Use these thresholds until the seven-day baseline supplies better values:

| Signal | Warning | Critical | Response |
| --- | --- | --- | --- |
| Compute at maximum | 5 continuous minutes | 15 continuous minutes | Inspect top total-time statements and route `db_ms` before raising the limit again. |
| CPU | p95 above 70% for 15 minutes | p95 above 85% for 15 minutes | Check call growth, mean query time, cache misses, Cron, and Queue overlap. |
| Database latency | Route p95 `db_ms` above 250 ms | Above 500 ms or any sustained failure | Correlate the route with `pg_stat_statements`; stop expensive background work if it competes with public reads. |
| Database retries | Any retry | More than five in five minutes | Check Neon status and Worker errors. Do not retry ambiguous writes. |
| HTTP 5xx | Above 0.5% for five minutes | Above 1% or readiness failure | Use `request_id` and `cf_ray` to correlate the event. |
| Monthly compute forecast | Above 75% of budget | Above 90% of budget | Reduce non-production activity and review average CU before changing provider or capacity. |
| Staging compute | Active with no test session for 30 minutes | Continuous daily use without an approved soak | Pause or reduce staging Cron activity before relying on scale-to-zero. |

Set billing warnings at 75% and 90% of the approved monthly database budget.
After the plan upgrade, use Neon's paid-plan consumption history to verify the
forecast against invoice-aligned Compute Unit seconds.

## Workers Logs views

Create these saved views for both production and staging:

- Slow database routes: `t = access` and `db_ms >= 250`.
- Database instability: `t = access` and (`db_retries > 0` or
  `db_failures > 0`).
- Slow requests: `t = access` and `dur_ms >= 500`.
- Cron failures: `t = cron_run` and `outcome = error`.
- Slow Cron runs: `t = cron_run`, grouped by `cron`, sorted by `dur_ms`.
- Queue failures: `t = queue_batch` and `outcome = error`.
- Slow Queue batches: `t = queue_batch`, grouped by `queue_kind`, sorted by
  `dur_ms`.
- JSON cache ratio: `t = edge_cache`, grouped by `family` and `outcome`. Treat
  `miss_fill` and `miss_uncacheable` as origin traffic.

Keep automatic invocation logs disabled. The custom logs provide the required
dimensions without adding one log record for every successful poll.

## Decision after seven days

Do not optimize from call count alone. A frequent query can be cheap. Rank work
in this order:

1. Total database execution time.
2. Public impact and p95 latency.
3. Calls multiplied by mean time.
4. Rows and blocks read compared with rows returned.
5. Temporary writes and WAL volume.

Verify Cloudflare cache behavior before adding an index or changing polling.
Apply query and index changes in staging first. Keep production migrations under
the existing human gate.
