/**
 * RED→GREEN: public earthquakes list envelope + empty-upsert bump policy.
 * Pure helpers — no DB. Spec: earthquake-sync-status.
 */
import { describe, expect, it } from "vitest";
import {
  buildEarthquakeListResponse,
  maxFetchedAt,
  shouldBumpFetchedAtAfterSync,
  type EarthquakeRowLike,
} from "@/services/earthquakes-list";

function row(partial: Partial<EarthquakeRowLike> & Pick<EarthquakeRowLike, "id" | "fetchedAt" | "occurredAt">): EarthquakeRowLike {
  return {
    magnitude: 5.1,
    place: "Demo Place",
    lat: 1,
    lng: -70,
    depthKm: 10,
    alert: null,
    tsunami: false,
    sig: 100,
    ...partial,
  };
}

describe("maxFetchedAt / buildEarthquakeListResponse", () => {
  it("empty rows → sync.fetchedAt === null", () => {
    expect(maxFetchedAt([])).toBeNull();
    const res = buildEarthquakeListResponse([], null);
    expect(res).toEqual({
      earthquakes: [],
      sync: { fetchedAt: null },
    });
  });

  it("after upsert stamps → sync.fetchedAt is MAX(fetchedAt)", () => {
    const rows = [
      row({ id: "a", occurredAt: 1000, fetchedAt: 2000 }),
      row({ id: "b", occurredAt: 3000, fetchedAt: 5000 }),
      row({ id: "c", occurredAt: 4000, fetchedAt: 4500 }),
    ];
    expect(maxFetchedAt(rows.map((r) => r.fetchedAt))).toBe(5000);
    const res = buildEarthquakeListResponse(rows, 5000);
    expect(res.sync.fetchedAt).toBe(5000);
    expect(res.earthquakes).toHaveLength(3);
    expect(res.earthquakes[0]).toMatchObject({
      id: "a",
      occurredAt: 1000,
      place: "Demo Place",
    });
    expect(res.earthquakes[0]).not.toHaveProperty("fetchedAt");
  });
});

describe("shouldBumpFetchedAtAfterSync", () => {
  it("upserted===0 → bump (refresh MAX on quiet successful sync)", () => {
    expect(shouldBumpFetchedAtAfterSync(0)).toBe(true);
  });

  it("upserted>0 → no bump (upsert already wrote fetchedAt)", () => {
    expect(shouldBumpFetchedAtAfterSync(1)).toBe(false);
    expect(shouldBumpFetchedAtAfterSync(12)).toBe(false);
  });
});
