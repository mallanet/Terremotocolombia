/**
 * Llamadas al BFF `/api/admin/family-search/*` — todas vía
 * `requestDecisionJson` (compartido con U5/patient-imports, ver
 * `@/src/shared/mutation/use-decision-mutation`) para que TANTO lecturas
 * como escrituras lancen `DecisionRequestError` con el status HTTP real
 * adjunto — el componente de ficha necesita distinguir un 404 (cluster no
 * encontrado) igual que match-card necesita distinguir 409/403.
 */
import {
  jsonRequestInit,
  requestDecisionJson,
} from "@/src/shared/mutation/use-decision-mutation";
import type {
  ClusterFichaResponse,
  DecisionResponse,
  LinkDecisionValue,
  ProposeResponse,
  QueueResponse,
  RecordSearchResponse,
  UnmergeResponse,
} from "./types";

const BASE = "/api/admin/family-search";

export function queueQueryKey(status?: string) {
  return ["family-search-queue", status ?? "proposed"] as const;
}

export async function fetchQueuePage(params: {
  status?: string;
  before?: string | null;
  limit?: number;
}): Promise<QueueResponse> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.before) qs.set("before", params.before);
  qs.set("limit", String(params.limit ?? 25));
  return requestDecisionJson<QueueResponse>(`${BASE}/queue?${qs.toString()}`);
}

export interface DecisionPayload {
  decision: LinkDecisionValue;
  note?: string;
}

export function postDecision(linkId: string, payload: DecisionPayload): Promise<DecisionResponse> {
  return requestDecisionJson<DecisionResponse>(
    `${BASE}/decision/${encodeURIComponent(linkId)}`,
    jsonRequestInit("POST", payload),
  );
}

export function postPropose(prnA: string, prnB: string): Promise<ProposeResponse> {
  return requestDecisionJson<ProposeResponse>(
    `${BASE}/propose`,
    jsonRequestInit("POST", { prnA, prnB }),
  );
}

export function postUnmerge(linkId: string, note?: string): Promise<UnmergeResponse> {
  return requestDecisionJson<UnmergeResponse>(
    `${BASE}/unmerge/${encodeURIComponent(linkId)}`,
    jsonRequestInit("POST", { note }),
  );
}

export function fetchRecordsSearch(q: string, limit = 20): Promise<RecordSearchResponse> {
  const qs = new URLSearchParams({ q, limit: String(limit) });
  return requestDecisionJson<RecordSearchResponse>(`${BASE}/records/search?${qs.toString()}`);
}

export function fetchClusterFicha(clusterId: string): Promise<ClusterFichaResponse> {
  return requestDecisionJson<ClusterFichaResponse>(
    `${BASE}/clusters/${encodeURIComponent(clusterId)}`,
  );
}
