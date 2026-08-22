/**
 * U0 schema capability verifier.
 *
 * Today: column drift (including campaign tables) plus journal SHA256.
 * Phase B (U7/U8) adds indexes, indisvalid, constraint state, and ownership.
 * Those checks must fail closed once implemented; they must not silently
 * report pass before they exist.
 */
import { resolve } from "node:path";
import { journalSha256 } from "./schema-capability";
import { expectedFromSchema, runSchemaDriftCheck } from "./check-schema-drift";

const JOURNAL_PATH =
  process.env.MIGRATIONS_JOURNAL ||
  new URL("../../infra/db/migrations/meta/_journal.json", import.meta.url).pathname;

function isExecutedDirectly(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return resolve(entry).endsWith("check-platform-schema.ts");
}

export async function runPlatformSchemaCheck(databaseUrl: string): Promise<void> {
  const expected = expectedFromSchema();
  const digest = journalSha256(JOURNAL_PATH);
  console.log(
    `[platform-schema] capability=column-drift+journal tables=${expected.length}`,
  );
  console.log(`[platform-schema] journal sha256: ${digest}`);
  const expectedJournal = process.env.EXPECTED_JOURNAL_SHA?.trim();
  if (expectedJournal && expectedJournal !== digest) {
    console.error(
      `[platform-schema] journal SHA mismatch: expected ${expectedJournal}`,
    );
    process.exit(1);
  }

  const result = await runSchemaDriftCheck(databaseUrl);
  if (result.pending.length) {
    console.error(
      `[platform-schema] UNAPPLIED migrations: ${result.pending.join(", ")}`,
    );
  }
  if (!result.ok) {
    console.error("[platform-schema] column drift failed (see check-schema-drift).");
    if (result.missingTables.length) {
      console.error(`  missing tables: ${result.missingTables.join(", ")}`);
    }
    for (const column of result.missingColumns) {
      console.error(`  missing column: ${column}`);
    }
    process.exit(1);
  }

  console.log(
    "[platform-schema] indexes/constraints/ownership: not required until Phase B U7/U8",
  );
  console.log("[platform-schema] OK");
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  await runPlatformSchemaCheck(url);
}

if (isExecutedDirectly()) {
  main().catch((err) => {
    console.error("[platform-schema] fatal:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
