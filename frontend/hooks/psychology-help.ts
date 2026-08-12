"use client";

/**
 * Contador público de "Ayuda psicosocial" (backend: /api/stats/psychology-help).
 * Cuenta CLICS únicos por IP (dedup server-side por hash de IP): el destino es
 * un grupo de WhatsApp, no hay "envío" observable — el clic es la señal real.
 * El backend conserva además el path source:"form" (callback autenticado) por
 * si un formulario externo vuelve a cablearse.
 */
import { useQuery } from "@tanstack/react-query";
import { apiGet, apiUrl } from "@/lib/api";

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

/**
 * Registra un clic en el botón de ayuda psicosocial. Fire-and-forget: el
 * usuario sale hacia WhatsApp en el mismo gesto, así que va por sendBeacon
 * (POST simple sin cuerpo, sobrevive a la navegación) con fallback a fetch
 * keepalive. Nunca lanza ni bloquea la navegación.
 */
export function trackPsychosocialClick(): void {
  const url = apiUrl("/api/stats/psychology-help");
  if (typeof navigator !== "undefined" && navigator.sendBeacon?.(url)) return;
  void fetch(url, { method: "POST", keepalive: true }).catch(() => {});
}
