"use client";

/**
 * Hooks de datos del dominio "emergency" (TanStack Query). Espeja el patrón
 * canónico de hooks/missing.ts:
 *  - queries polleadas: useQuery + queryKey de qk.* + refetchInterval
 *    (pausado en background por el client). queryFn usa apiGet (ETag/304).
 *  - mutaciones de admin/confirmación: useMutation + invalidateQueries en onSuccess.
 *  - contrato JSON idéntico al backend (GET /api/reports, GET /api/missing/map,
 *    POST /api/reports/:id/confirm, DELETE /api/reports/:id).
 *
 * IMPORTANTE: la creación de reportes (POST /api/reports) NO vive aquí. Es
 * offline-aware (cola IndexedDB) y vive en lib/offline-queue.ts + post-report.ts
 * — no se migra a TanStack ni se toca su lógica de reintento.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiSend } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { EmergencyReport, EarthquakesListResponse } from "@/lib/types";
import type { MissingMapMarker } from "@/hooks/missing";
import type { MapBounds } from "@/components/features/map";

export interface ReportsResponse {
  reports: EmergencyReport[];
  persistent: boolean;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const REPORT_PAGE_SIZE = 500;
const REPORT_PAGE_CONCURRENCY = 4;

type FetchReportsPage = (
  page: number,
  signal?: AbortSignal,
) => Promise<ReportsResponse>;

/**
 * Recorre el contrato paginado del backend sin volver a truncar el mapa en la
 * primera página. Las páginas adicionales se piden en lotes pequeños para no
 * convertir cada poll en una ráfaga sin límite contra la API.
 */
export async function fetchAllReportPages(
  fetchPage: FetchReportsPage,
  signal?: AbortSignal,
): Promise<ReportsResponse> {
  const first = await fetchPage(1, signal);
  const totalPages = Math.max(1, Math.trunc(first.totalPages || 1));
  const pages: ReportsResponse[] = [first];

  for (let page = 2; page <= totalPages; page += REPORT_PAGE_CONCURRENCY) {
    const pageNumbers = Array.from(
      { length: Math.min(REPORT_PAGE_CONCURRENCY, totalPages - page + 1) },
      (_, index) => page + index,
    );
    pages.push(
      ...(await Promise.all(
        pageNumbers.map((number) => fetchPage(number, signal)),
      )),
    );
  }

  // Una inserción durante el recorrido por offsets puede repetir el último
  // elemento de una página. Conservamos el orden más-reciente-primero y
  // eliminamos ese duplicado por id.
  const reports = Array.from(
    new Map(
      pages
        .flatMap((response) => response.reports)
        .map((report) => [report.id, report]),
    ).values(),
  );
  return { ...first, reports };
}

async function fetchReportsPage(page: number, signal?: AbortSignal) {
  return apiGet<ReportsResponse>(
    `/api/reports?page=${page}&pageSize=${REPORT_PAGE_SIZE}`,
    signal,
  );
}

/** Lista completa de reportes de emergencia (polleada) para el mapa. */
export function useReports(pollMs: number) {
  return useQuery({
    queryKey: qk.reports.list,
    queryFn: ({ signal }) => fetchAllReportPages(fetchReportsPage, signal),
    refetchInterval: pollMs,
    placeholderData: (prev) => prev,
  });
}

export type EarthquakesResponse = EarthquakesListResponse;

/** Sismos recientes (catálogo USGS + sync). Returns the full envelope so the
 * panel can distinguish quiet catalog from dead sync / transport errors. */
export function useEarthquakes(pollMs: number) {
  return useQuery({
    queryKey: qk.earthquakes.list,
    queryFn: ({ signal }) =>
      apiGet<EarthquakesResponse>("/api/earthquakes", signal),
    refetchInterval: pollMs,
    placeholderData: (prev) => prev,
  });
}

function buildMissingMapUrl(bounds: MapBounds | null): string {
  return bounds
    ? `/api/missing/map?north=${bounds.north}&south=${bounds.south}&east=${bounds.east}&west=${bounds.west}&limit=800`
    : "/api/missing/map?limit=800";
}

export interface MissingMapResponse {
  markers: MissingMapMarker[];
}

/** Marcadores de desaparecidos para el mapa, acotados al viewport (bounds).
 *  El caller DEBE pasar bounds ya debounced (~350ms) para no pedir por cada pan. */
export function useMissingMap(bounds: MapBounds | null) {
  return useQuery({
    queryKey: qk.missing.map(bounds),
    queryFn: ({ signal }) =>
      apiGet<MissingMapResponse>(buildMissingMapUrl(bounds), signal).then(
        (r) => r.markers ?? [],
      ),
    placeholderData: (prev) => prev,
  });
}

// ---- Mutaciones ----

/** Confirma un reporte ("yo también lo veo"). El backend dedup por dispositivo. */
export function useConfirmReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiSend<unknown>("POST", `/api/reports/${id}/confirm`),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.reports.all }),
  });
}

/** Marca un reporte como atendido (admin → DELETE con token). */
export function useResolveReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; adminToken: string }) =>
      apiSend<void>("DELETE", `/api/reports/${args.id}`, undefined, {
        "x-admin-token": args.adminToken,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.reports.all }),
  });
}
