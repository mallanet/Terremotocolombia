"use client";

/**
 * Hooks del portal de psicólogos (/psicologia). Reutilizan la auth canónica
 * del repo (api/public/auth/* con JWT en cookie httpOnly — apiGet/apiSend ya
 * mandan credentials:"include"). La exclusividad la da la capability
 * `psychology:access`, verificada en servidor por /api/public/psychology.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiGet, apiSend } from "@/lib/api";

export interface PsychSession {
  user: { id: string; email: string; roleId: string | null; isAdmin: boolean };
  capabilities: string[];
}

export interface PsychPortalData {
  ok: boolean;
  user: { id: string; email: string };
  resources: unknown[];
}

const SESSION_KEY = ["psych-session"] as const;
const PORTAL_KEY = ["psych-portal"] as const;

export function usePsychSession() {
  return useQuery({
    queryKey: SESSION_KEY,
    retry: false,
    staleTime: 30_000,
    queryFn: async (): Promise<PsychSession | null> => {
      try {
        return await apiGet<PsychSession>("/api/public/auth/me");
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
  });
}

export function usePsychLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      apiSend<{ ok: boolean }>("POST", "/api/public/auth/login", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: SESSION_KEY }),
  });
}

export function usePsychLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiSend<{ ok: boolean }>("POST", "/api/public/auth/logout"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SESSION_KEY });
      qc.removeQueries({ queryKey: PORTAL_KEY });
    },
  });
}

/** Prueba de acceso real contra el servidor (403 => sin capability). */
export function usePsychPortal(enabled: boolean) {
  return useQuery({
    queryKey: PORTAL_KEY,
    enabled,
    retry: false,
    queryFn: async (): Promise<PsychPortalData | null> => {
      try {
        return await apiGet<PsychPortalData>("/api/public/psychology");
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
          return null;
        }
        throw e;
      }
    },
  });
}
