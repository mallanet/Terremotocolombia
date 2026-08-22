/**
 * Zero-dependency copy of backend/src/lib/promote-identity.ts for CI shells.
 * Keep the two files in lockstep; backend unit tests own the behavior.
 */
const FULL_SHA = /^[0-9a-f]{40}$/i;
const VERSION_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseWorkerVersionId(stdout) {
  const match = stdout.match(/Version ID:\s*([0-9a-f-]{36})/i);
  const id = match?.[1];
  if (!id || !VERSION_ID.test(id)) {
    throw new Error("wrangler output did not include a Worker Version ID");
  }
  return id.toLowerCase();
}

export function assertSourceSha(sha) {
  const normalized = sha.trim().toLowerCase();
  if (!FULL_SHA.test(normalized)) {
    throw new Error("source SHA must be the full 40-character git object name");
  }
  return normalized;
}

export function assertPromoteIdentity(input) {
  const approved = assertSourceSha(input.approvedSha);
  const artifact = assertSourceSha(input.artifactSha);
  if (approved !== artifact) {
    throw new Error(
      `refusing to promote SHA ${artifact} under approval for ${approved}`,
    );
  }
  const requested = input.requestedVersionId?.trim();
  const recorded = input.recordedVersionId?.trim();
  if (requested && recorded) {
    if (!VERSION_ID.test(requested) || !VERSION_ID.test(recorded)) {
      throw new Error("Worker version ID is malformed");
    }
    if (requested.toLowerCase() !== recorded.toLowerCase()) {
      throw new Error("Worker version ID does not match the recorded artifact");
    }
  }
  return { sha: approved, versionId: (recorded || requested)?.toLowerCase() };
}
