/**
 * Read-only Postgres workload report for operator use.
 *
 * Default output never prints SQL text or bind values. Pass --include-sql only
 * in a private terminal when a query ID must be mapped back to source code.
 */
import { neon } from "@neondatabase/serverless";

const includeSql = process.argv.includes("--include-sql");
const topArg = process.argv.find((arg) => arg.startsWith("--top="));
const parsedTop = Number(topArg?.slice("--top=".length) ?? 20);
const top = Number.isInteger(parsedTop) && parsedTop > 0 ? Math.min(parsedTop, 100) : 20;

interface ExtensionRow {
  installed: boolean;
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured.");
  const sql = neon(url);

  const [extension] = (await sql.query(
    `SELECT EXISTS (
       SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
     ) AS installed`,
  )) as ExtensionRow[];

  if (!extension?.installed) {
    throw new Error(
      "pg_stat_statements is not installed. Apply migration 0011_query_observability first.",
    );
  }

  const [info] = (await sql.query(
    "SELECT stats_reset::text AS stats_reset FROM pg_stat_statements_info",
  )) as { stats_reset: string | null }[];

  const queryTextColumn = includeSql
    ? `, left(regexp_replace(query, E'\\s+', ' ', 'g'), 500) AS normalized_sql`
    : "";
  const statements = await sql.query(
    `SELECT queryid::text AS query_id,
            calls::bigint AS calls,
            round(total_exec_time::numeric, 2) AS total_exec_ms,
            round(mean_exec_time::numeric, 2) AS mean_exec_ms,
            rows::bigint AS rows,
            shared_blks_hit::bigint AS shared_blocks_hit,
            shared_blks_read::bigint AS shared_blocks_read,
            temp_blks_written::bigint AS temp_blocks_written,
            round(wal_bytes::numeric, 0) AS wal_bytes
            ${queryTextColumn}
       FROM pg_stat_statements
      WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
        AND query NOT ILIKE '%pg_stat_statements%'
      ORDER BY total_exec_time DESC
      LIMIT $1`,
    [top],
  );

  const tables = await sql.query(
    `SELECT relname AS table_name,
            seq_scan::bigint AS sequential_scans,
            idx_scan::bigint AS index_scans,
            n_live_tup::bigint AS estimated_live_rows,
            n_dead_tup::bigint AS estimated_dead_rows,
            pg_size_pretty(pg_total_relation_size(relid)) AS total_size
       FROM pg_stat_user_tables
      ORDER BY seq_scan DESC
      LIMIT $1`,
    [top],
  );

  console.log(
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        stats_reset: info?.stats_reset ?? null,
        sql_included: includeSql,
        top_by_total_execution_time: statements,
        top_tables_by_sequential_scans: tables,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("[observe:db] fatal:", error instanceof Error ? error.message : error);
  process.exit(1);
});
