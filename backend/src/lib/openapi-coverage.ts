import { readFileSync } from "fs";
import {
  type OpenApiOperationId,
  listOpenApiOperations,
  operationKey,
} from "@/lib/openapi-canonical";
import { isContractOperation } from "@/lib/openapi-contracts";

export type CoverageSource = "contracts" | "legacy-jsdoc" | "legacy-crud";

export type CoverageRoute = OpenApiOperationId & { source: CoverageSource };

export type CoverageManifest = {
  version: 1;
  required: OpenApiOperationId[];
  routes: CoverageRoute[];
};

const CRUD_PATH_PREFIX = "/api/public/";

const CRUD_RESOURCE_BASES = new Set([
  "reports",
  "missing",
  "pets",
  "hospitals",
  "patients",
  "donations",
  "chat",
  "contact",
  "volunteers",
  "volunteer-tasks",
  "volunteer-checkins",
  "roles",
  "campaign-sites",
  "campaign-stewards",
  "campaign-pledges",
  "campaign-shipments",
]);

export function parseCoverageManifest(raw: unknown): CoverageManifest {
  if (!raw || typeof raw !== "object") {
    throw new Error("coverage manifest must be an object");
  }
  const body = raw as Record<string, unknown>;
  if (body.version !== 1) {
    throw new Error("coverage manifest version must be 1");
  }
  if (!Array.isArray(body.required) || !Array.isArray(body.routes)) {
    throw new Error("coverage manifest needs required[] and routes[]");
  }
  return {
    version: 1,
    required: body.required.map(readOperation),
    routes: body.routes.map(readRoute),
  };
}

function readOperation(raw: unknown): OpenApiOperationId {
  if (!raw || typeof raw !== "object") {
    throw new Error("coverage operation must be an object");
  }
  const body = raw as Record<string, unknown>;
  if (typeof body.method !== "string" || typeof body.path !== "string") {
    throw new Error("coverage operation needs method and path");
  }
  return { method: body.method.toLowerCase(), path: body.path };
}

function readRoute(raw: unknown): CoverageRoute {
  const op = readOperation(raw);
  const source = (raw as { source?: unknown }).source;
  if (source !== "contracts" && source !== "legacy-jsdoc" && source !== "legacy-crud") {
    throw new Error(`invalid coverage source for ${operationKey(op)}`);
  }
  return { ...op, source };
}

export function expectedSource(op: OpenApiOperationId): CoverageSource {
  if (isContractOperation(op)) return "contracts";
  if (isCrudFactoryPath(op.path) && ["get", "post", "patch", "delete"].includes(op.method)) {
    return "legacy-crud";
  }
  return "legacy-jsdoc";
}

function isCrudFactoryPath(path: string): boolean {
  if (!path.startsWith(CRUD_PATH_PREFIX)) return false;
  const rest = path.slice(CRUD_PATH_PREFIX.length);
  const parts = rest.split("/").filter(Boolean);
  const resource = parts[0];
  if (!resource || !CRUD_RESOURCE_BASES.has(resource)) return false;
  if (parts.length === 1) return true;
  return parts.length === 2 && parts[1] === "{id}";
}

export type CoverageIssue = { code: string; detail: string };

export function checkOpenApiCoverage(
  spec: { paths?: Record<string, Record<string, unknown> | undefined> },
  manifest: CoverageManifest,
): CoverageIssue[] {
  const issues: CoverageIssue[] = [];
  const specOps = listOpenApiOperations(spec);
  const specKeys = new Set(specOps.map(operationKey));
  const manifestKeys = new Set(manifest.routes.map(operationKey));

  for (const op of specOps) {
    if (!manifestKeys.has(operationKey(op))) {
      issues.push({ code: "missing-from-manifest", detail: operationKey(op) });
    }
  }
  for (const route of manifest.routes) {
    if (!specKeys.has(operationKey(route))) {
      issues.push({ code: "missing-from-spec", detail: operationKey(route) });
    }
    const expected = expectedSource(route);
    if (route.source !== expected) {
      issues.push({
        code: "wrong-source",
        detail: `${operationKey(route)} is ${route.source}, expected ${expected}`,
      });
    }
  }

  const routeKeys = new Set(manifest.routes.map(operationKey));
  for (const op of manifest.required) {
    if (!routeKeys.has(operationKey(op)) || !specKeys.has(operationKey(op))) {
      issues.push({ code: "required-missing", detail: operationKey(op) });
    }
  }

  const seen = new Set<string>();
  for (const route of manifest.routes) {
    const key = operationKey(route);
    if (seen.has(key)) {
      issues.push({ code: "duplicate", detail: key });
    }
    seen.add(key);
  }

  return issues;
}

export function loadCoverageManifest(filePath: string): CoverageManifest {
  const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  return parseCoverageManifest(raw);
}

export function formatCoverageIssues(issues: CoverageIssue[]): string {
  return issues.map((issue) => `${issue.code}: ${issue.detail}`).join("\n");
}
