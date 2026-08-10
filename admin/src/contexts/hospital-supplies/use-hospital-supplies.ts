"use client";

/**
 * Hooks TanStack Query del contexto de insumos hospitalarios. Todo HTTP va
 * same-origin al BFF (`/api/admin/hospital-supplies/*`), que reenvía al backend
 * con la sesión; el backend decide la autorización real (hospital:read/edit).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminFetch, type FetchInit } from "@/src/shared/http/admin-fetch";
import type { SupplyBoard, SupplyEventRow } from "./types";

const BOARD_KEY = ["hospital-supplies", "board"] as const;

async function requestJson<T>(url: string, init?: FetchInit): Promise<T> {
  const response = await adminFetch(url, init);
  const body = (await response.json().catch(() => null)) as T | { error?: string } | null;
  if (!response.ok) {
    throw new Error((body as { error?: string } | null)?.error ?? `Error ${response.status}`);
  }
  return body as T;
}

function jsonInit(method: string, body: unknown): FetchInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function useSupplyBoard() {
  return useQuery({
    queryKey: BOARD_KEY,
    queryFn: () => requestJson<SupplyBoard>("/api/admin/hospital-supplies"),
    refetchInterval: 60_000,
  });
}

export function useSupplyEvents(hospitalId: string | null) {
  return useQuery({
    queryKey: ["hospital-supplies", "events", hospitalId],
    queryFn: () =>
      requestJson<{ items: SupplyEventRow[] }>(
        `/api/admin/hospital-supplies/${encodeURIComponent(hospitalId!)}/events`,
      ),
    enabled: Boolean(hospitalId),
  });
}

/** Mutaciones de un hospital; todas invalidan el board al terminar. */
export function useSupplyMutations(hospitalId: string) {
  const queryClient = useQueryClient();
  const base = `/api/admin/hospital-supplies/${encodeURIComponent(hospitalId)}`;
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: BOARD_KEY });
    void queryClient.invalidateQueries({
      queryKey: ["hospital-supplies", "events", hospitalId],
    });
  };

  const updateStatus = useMutation({
    mutationFn: (body: unknown) => requestJson(`${base}/status`, jsonInit("POST", body)),
    onSuccess: refresh,
  });
  const createNeed = useMutation({
    mutationFn: (body: unknown) => requestJson(`${base}/needs`, jsonInit("POST", body)),
    onSuccess: refresh,
  });
  const patchNeed = useMutation({
    mutationFn: ({ needId, ...body }: { needId: string } & Record<string, unknown>) =>
      requestJson(`${base}/needs/${encodeURIComponent(needId)}`, jsonInit("PATCH", body)),
    onSuccess: refresh,
  });
  const patchHelp = useMutation({
    mutationFn: ({ requestId, ...body }: { requestId: string } & Record<string, unknown>) =>
      requestJson(`${base}/help/${encodeURIComponent(requestId)}`, jsonInit("PATCH", body)),
    onSuccess: refresh,
  });

  return { updateStatus, createNeed, patchNeed, patchHelp };
}
