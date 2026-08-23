import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ensureOpenApiGenerateEnv } from "@/lib/openapi-env";
import { serializeCanonicalJson } from "@/lib/openapi-canonical";
import {
  checkOpenApiCoverage,
  formatCoverageIssues,
  loadCoverageManifest,
} from "@/lib/openapi-coverage";

ensureOpenApiGenerateEnv();

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, "../../..");
export const OPENAPI_SPEC_PATH = path.join(REPO_ROOT, "docs/api/openapi.json");
export const COVERAGE_MANIFEST_PATH = path.join(
  REPO_ROOT,
  "docs/api/contract-coverage.json",
);

export async function buildCanonicalOpenApiSpec(): Promise<Record<string, unknown>> {
  const { buildOpenApiSpec } = await import("@/lib/swagger");
  return buildOpenApiSpec() as Record<string, unknown>;
}

export async function serializeOpenApiSpec(): Promise<string> {
  return serializeCanonicalJson(await buildCanonicalOpenApiSpec());
}

export async function writeOpenApiSpec(dest = OPENAPI_SPEC_PATH): Promise<string> {
  const body = await serializeOpenApiSpec();
  mkdirSync(path.dirname(dest), { recursive: true });
  writeFileSync(dest, body);
  return body;
}

export async function checkCommittedOpenApiMatchesGenerated(
  dest = OPENAPI_SPEC_PATH,
): Promise<void> {
  const generated = await serializeOpenApiSpec();
  const committed = readFileSync(dest, "utf8");
  if (committed !== generated) {
    throw new Error(
      `${path.relative(REPO_ROOT, dest)} is stale. Run: cd backend && npm run openapi:generate`,
    );
  }
}

export async function checkOpenApiCoverageFile(
  specPath = OPENAPI_SPEC_PATH,
  manifestPath = COVERAGE_MANIFEST_PATH,
): Promise<void> {
  const spec = JSON.parse(readFileSync(specPath, "utf8")) as {
    paths?: Record<string, Record<string, unknown> | undefined>;
  };
  const issues = checkOpenApiCoverage(spec, loadCoverageManifest(manifestPath));
  if (issues.length) {
    throw new Error(`OpenAPI coverage failed:\n${formatCoverageIssues(issues)}`);
  }
}

async function main(): Promise<void> {
  const mode = process.argv[2] ?? "write";
  if (mode === "write") {
    const dest = process.argv[3];
    await writeOpenApiSpec(dest || OPENAPI_SPEC_PATH);
    return;
  }
  if (mode === "check") {
    await checkCommittedOpenApiMatchesGenerated();
    await checkOpenApiCoverageFile();
    return;
  }
  if (mode === "print-ops") {
    const { listOpenApiOperations, operationKey } = await import(
      "@/lib/openapi-canonical"
    );
    const spec = await buildCanonicalOpenApiSpec();
    for (const op of listOpenApiOperations(spec)) {
      process.stdout.write(`${operationKey(op)}\n`);
    }
    return;
  }
  throw new Error(`unknown mode: ${mode}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
