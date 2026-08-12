/** Public earthquake DTO — allowlist only (no fetchedAt / internals). */
export interface EarthquakeDTO {
  id: string;
  magnitude: number | null;
  place: string;
  lat: number;
  lng: number;
  depthKm: number | null;
  alert: string | null;
  tsunami: boolean;
  sig: number | null;
  occurredAt: number; // epoch-ms
}
