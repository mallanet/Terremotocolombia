/**
 * Pure check mirroring scripts/verify-jobs.sh earthquake sync-age gate.
 * Spec: job-verification-earthquakes — judge sync freshness, not event age.
 */
import { describe, expect, it } from "vitest";
import {
  EARTHQUAKE_SYNC_AGE_MS,
  isEarthquakeSyncFresh,
  evaluateEarthquakeSyncCheck,
} from "@/lib/earthquake-sync-age";

describe("earthquake sync-age verify gate", () => {
  const now = 1_700_000_000_000;

  it("PASS when sync.fetchedAt is fresh even if occurredAt is old", () => {
    const result = evaluateEarthquakeSyncCheck(
      {
        earthquakes: [{ occurredAt: now - 48 * 3600 * 1000 }],
        sync: { fetchedAt: now - 5 * 60 * 1000 },
      },
      now,
    );
    expect(EARTHQUAKE_SYNC_AGE_MS).toBe(1_200_000);
    expect(isEarthquakeSyncFresh(now - 5 * 60 * 1000, now)).toBe(true);
    expect(result.ok).toBe(true);
  });

  it("FAIL when sync.fetchedAt is null", () => {
    expect(
      evaluateEarthquakeSyncCheck(
        { earthquakes: [], sync: { fetchedAt: null } },
        now,
      ).ok,
    ).toBe(false);
  });

  it("FAIL when sync is missing from the envelope", () => {
    expect(
      evaluateEarthquakeSyncCheck({ earthquakes: [{ occurredAt: now }] }, now).ok,
    ).toBe(false);
  });

  it("FAIL when sync.fetchedAt is older than 20 minutes", () => {
    expect(
      isEarthquakeSyncFresh(now - EARTHQUAKE_SYNC_AGE_MS - 1, now),
    ).toBe(false);
    expect(
      evaluateEarthquakeSyncCheck(
        {
          earthquakes: [{ occurredAt: now }],
          sync: { fetchedAt: now - EARTHQUAKE_SYNC_AGE_MS - 1 },
        },
        now,
      ).ok,
    ).toBe(false);
  });
});
