"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import { ACOPIO_DEFAULT_COUNTRY } from "@/lib/acopio";
import { mergeShelterReports, type ShelterReportLike } from "@/lib/acopio-from-reports";
import { useCollectionCenters, type AcopioFilters } from "@/hooks/acopio";

interface ReportsListPayload {
  reports?: ShelterReportLike[];
}

export function useAcopioDirectory(filters: AcopioFilters) {
  const acopio = useCollectionCenters(filters);
  const reportsQuery = useQuery({
    queryKey: qk.reports.list,
    queryFn: ({ signal }) =>
      apiGet<ReportsListPayload>("/api/reports?page=1&pageSize=500", signal),
    staleTime: 4_000,
  });
  const data = useMemo(
    () =>
      mergeShelterReports(
        acopio.data,
        reportsQuery.data?.reports ?? [],
        ACOPIO_DEFAULT_COUNTRY,
        filters,
      ),
    [acopio.data, reportsQuery.data?.reports, filters],
  );
  return { ...acopio, data };
}
