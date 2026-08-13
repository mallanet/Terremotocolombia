/**
 * Pure helpers for the public earthquakes list envelope and quiet-sync bump
 * policy. Kept free of DB/env imports so unit tests stay hermetic.
 */
import type { EarthquakeDTO } from "./earthquakes-types";

export type { EarthquakeDTO };

/** Minimal row shape needed to build the public list DTO + sync stamp. */
export interface EarthquakeRowLike {
  id: string;
  magnitude: number | null;
  place: string;
  lat: number;
  lng: number;
  depthKm: number | null;
  alert: string | null;
  tsunami: boolean;
  sig: number | null;
  occurredAt: number;
  fetchedAt: number;
}

export interface EarthquakeSync {
  /** Epoch-ms of last successful sync signal; null if never synced / empty table. */
  fetchedAt: number | null;
}

export interface EarthquakeListResponse {
  earthquakes: EarthquakeDTO[];
  sync: EarthquakeSync;
}

/** MAX over fetchedAt stamps; empty → null (never invent a stamp). */
export function maxFetchedAt(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  let max = values[0]!;
  for (let i = 1; i < values.length; i++) {
    const v = values[i]!;
    if (v > max) max = v;
  }
  return max;
}

export function toEarthquakeDTO(r: EarthquakeRowLike): EarthquakeDTO {
  return {
    id: r.id,
    magnitude: r.magnitude,
    place: r.place,
    lat: r.lat,
    lng: r.lng,
    depthKm: r.depthKm,
    alert: r.alert,
    tsunami: r.tsunami,
    sig: r.sig,
    occurredAt: r.occurredAt,
  };
}

/**
 * Build the public list envelope. `syncFetchedAt` is the table-level
 * MAX(fetched_at) (or null), not derived from the limited page alone when
 * callers already computed it.
 */
export function buildEarthquakeListResponse(
  rows: readonly EarthquakeRowLike[],
  syncFetchedAt: number | null,
): EarthquakeListResponse {
  return {
    earthquakes: rows.map(toEarthquakeDTO),
    sync: { fetchedAt: syncFetchedAt },
  };
}

/**
 * Successful USGS feed/backfill with zero upserts must still refresh sync
 * freshness (bump newest row's fetchedAt). Non-zero upserts already wrote it.
 */
export function shouldBumpFetchedAtAfterSync(upserted: number): boolean {
  return upserted === 0;
}
