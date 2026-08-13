/**
 * Sync-age gate for earthquake job verification.
 * Keep EARTHQUAKE_SYNC_AGE_MS in sync with SYNC_AGE_MS in scripts/verify-jobs.sh.
 */
/** 20 minutes — cron every 5m plus a few missed cycles / cache jitter. */
export const EARTHQUAKE_SYNC_AGE_MS = 1_200_000;

export function isEarthquakeSyncFresh(
  syncFetchedAt: number | null | undefined,
  nowMs: number,
): boolean {
  if (syncFetchedAt == null || !Number.isFinite(syncFetchedAt)) return false;
  return nowMs - syncFetchedAt <= EARTHQUAKE_SYNC_AGE_MS;
}

export function evaluateEarthquakeSyncCheck(
  data: unknown,
  nowMs: number,
): { ok: boolean; reason: string } {
  if (!data || typeof data !== "object") {
    return { ok: false, reason: "invalid JSON body" };
  }
  const sync = (data as { sync?: { fetchedAt?: number | null } }).sync;
  if (!sync || !("fetchedAt" in sync)) {
    return { ok: false, reason: "missing sync.fetchedAt" };
  }
  const fetchedAt = sync.fetchedAt;
  if (fetchedAt === null || fetchedAt === undefined) {
    return { ok: false, reason: "sync.fetchedAt is null" };
  }
  if (!Number.isFinite(fetchedAt)) {
    return { ok: false, reason: "sync.fetchedAt is not a number" };
  }
  if (!isEarthquakeSyncFresh(fetchedAt, nowMs)) {
    return { ok: false, reason: `sync.fetchedAt stale (>${EARTHQUAKE_SYNC_AGE_MS}ms)` };
  }
  return { ok: true, reason: "sync.fetchedAt fresh" };
}
