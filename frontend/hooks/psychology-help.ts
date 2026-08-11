"use client";

/**
 * Contador público de clics en "Ayuda psicológica" (backend:
 * /api/stats/psychology-help, dedup por hash de IP). La lectura es
 * ETag-cacheada; el POST devuelve el total resultante y se siembra en caché.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiSend } from "@/lib/api";

const KEY = ["psych-help-clicks"] as const;

export function usePsychHelpClickCount() {
  return useQuery({
    queryKey: KEY,
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: () => apiGet<{ count: number }>("/api/stats/psychology-help"),
    select: (d) => d.count,
  });
}

export function usePsychHelpClick() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiSend<{ count: number }>("POST", "/api/stats/psychology-help"),
    onSuccess: (data) => qc.setQueryData(KEY, data),
  });
}
