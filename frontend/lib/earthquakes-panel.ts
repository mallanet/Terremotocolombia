/**
 * Pure presentation helpers for the public "Sismos recientes" panel.
 * Spec: earthquakes-public-ui — USGS + ~5 min copy; quiet ≠ transport error.
 */

/** Refresh cadence copy consistent with production Cron Trigger (every 5 min). */
export const EARTHQUAKES_CADENCE_COPY_ES =
  "actualizado cada ~5 minutos";

export function earthquakesPanelSubtitle(regionLabel: string): string {
  return `Catálogo USGS de ${regionLabel}, ${EARTHQUAKES_CADENCE_COPY_ES}.`;
}

/** In-process freshness window aligned with verify-jobs SYNC_AGE_MS (20m). */
export const EARTHQUAKES_SYNC_FRESH_MS = 1_200_000;

export type EarthquakesPanelView =
  | "loading"
  | "error"
  | "quiet"
  | "list";

export function resolveEarthquakesPanelView(input: {
  isLoading: boolean;
  isError: boolean;
  filteredCount: number;
}): EarthquakesPanelView {
  if (input.isLoading) return "loading";
  // Transport/API failure only — never treat a quiet USGS catalog as error.
  if (input.isError) return "error";
  if (input.filteredCount === 0) return "quiet";
  return "list";
}

export function earthquakesQuietMessage(opts: {
  minMag: number;
  syncFetchedAt: number | null | undefined;
  nowMs: number;
}): string {
  const syncFresh =
    opts.syncFetchedAt != null &&
    Number.isFinite(opts.syncFetchedAt) &&
    opts.nowMs - opts.syncFetchedAt <= EARTHQUAKES_SYNC_FRESH_MS;

  if (syncFresh) {
    return `USGS no tiene sismos de magnitud ${opts.minMag}+ más recientes en el catálogo (sincronización al día).`;
  }
  return `Sin sismos de magnitud ${opts.minMag}+ en el catálogo reciente.`;
}

/** Slice A must not introduce a new client time-window filter. */
export function preservesListTimeWindow(appliedExtraTimeFilter: boolean): boolean {
  return !appliedExtraTimeFilter;
}
