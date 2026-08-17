-- Query attribution for Neon/Postgres. The extension records normalized SQL
-- and aggregate timings; bind values are not stored in pg_stat_statements.
--
-- This is an operational extension only. It creates no application tables and
-- is safe to apply more than once. Production application remains a manual,
-- human-gated step (see CLAUDE.md).
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
