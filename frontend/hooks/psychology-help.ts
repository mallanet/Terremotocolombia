"use client";

/**
 * Contador público de "Ayuda psicológica" (backend: /api/stats/psychology-help).
 * Cuenta ENVÍOS del Google Forms (callback del Apps Script con secreto), no
 * clics — por eso aquí solo hay lectura (ETag-cacheada, poll de 60s).
 */
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";

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
