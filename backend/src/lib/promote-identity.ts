const FULL_SHA = /^[0-9a-f]{40}$/i;
const VERSION_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class PromoteIdentityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PromoteIdentityError";
  }
}

export function parseWorkerVersionId(stdout: string): string {
  const match = stdout.match(/Version ID:\s*([0-9a-f-]{36})/i);
  const id = match?.[1];
  if (!id || !VERSION_ID.test(id)) {
    throw new PromoteIdentityError(
      "wrangler output did not include a Worker Version ID",
    );
  }
  return id.toLowerCase();
}

export function assertSourceSha(sha: string): string {
  const normalized = sha.trim().toLowerCase();
  if (!FULL_SHA.test(normalized)) {
    throw new PromoteIdentityError(
      "source SHA must be the full 40-character git object name",
    );
  }
  return normalized;
}

/**
 * Refuse to promote artifact B under an approval that names SHA A.
 * Optional Worker version IDs must match when both are present.
 */
export function assertPromoteIdentity(input: {
  approvedSha: string;
  artifactSha: string;
  requestedVersionId?: string;
  recordedVersionId?: string;
}): { sha: string; versionId?: string } {
  const approved = assertSourceSha(input.approvedSha);
  const artifact = assertSourceSha(input.artifactSha);
  if (approved !== artifact) {
    throw new PromoteIdentityError(
      `refusing to promote SHA ${artifact} under approval for ${approved}`,
    );
  }
  const requested = input.requestedVersionId?.trim();
  const recorded = input.recordedVersionId?.trim();
  if (requested && recorded) {
    if (!VERSION_ID.test(requested) || !VERSION_ID.test(recorded)) {
      throw new PromoteIdentityError("Worker version ID is malformed");
    }
    if (requested.toLowerCase() !== recorded.toLowerCase()) {
      throw new PromoteIdentityError(
        "Worker version ID does not match the recorded artifact",
      );
    }
  }
  return {
    sha: approved,
    versionId: (recorded || requested)?.toLowerCase(),
  };
}

export type SmokeVerdict =
  | "ok"
  | "readyz-unhealthy"
  | "domain-fail-while-ready"
  | "sha-mismatch";

export function evaluateDomainSmoke(input: {
  readyzOk: boolean;
  domainChecks: { name: string; ok: boolean }[];
  expectedSha?: string;
  servedShas?: { name: string; sha: string }[];
}): { verdict: SmokeVerdict; failed: string[] } {
  if (input.expectedSha && input.servedShas) {
    const expected = input.expectedSha.trim().toLowerCase();
    const mismatches = input.servedShas.filter(
      (item) => item.sha.trim().toLowerCase() !== expected,
    );
    if (mismatches.length > 0) {
      return {
        verdict: "sha-mismatch",
        failed: mismatches.map((item) => item.name),
      };
    }
  }
  const failed = input.domainChecks.filter((check) => !check.ok).map((check) => check.name);
  if (!input.readyzOk) {
    return { verdict: "readyz-unhealthy", failed: ["readyz", ...failed] };
  }
  if (failed.length > 0) {
    return { verdict: "domain-fail-while-ready", failed };
  }
  return { verdict: "ok", failed: [] };
}
