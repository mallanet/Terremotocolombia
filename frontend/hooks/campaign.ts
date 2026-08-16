"use client";

/**
 * Hooks de datos de la campaña de reconstrucción. Mismo patrón canónico que
 * hooks/contact.ts: la mutación va por apiSend y el componente no hace fetch.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiGet, apiSend } from "@/lib/api";
import type { CampaignBalance, MaterialKey } from "@/lib/campaign-materials";

const STEWARD_HEADER = "x-campaign-steward-token";

export interface PledgeItemInput {
  material: MaterialKey;
  quantity: number;
}

export interface PledgeInput {
  siteId: string | null;
  donorName: string;
  donorContact: string;
  publicAlias?: string;
  showInWall: boolean;
  items: PledgeItemInput[];
  note?: string;
  source?: string;
  turnstileToken?: string;
}

export interface PledgeResponse {
  ok: boolean;
  code: string;
  message?: string;
}

export function useCampaignPledge() {
  return useMutation({
    mutationFn: (input: PledgeInput) =>
      apiSend<PledgeResponse>("POST", "/api/campaign/compromisos", input),
  });
}

/**
 * Balance público. Se refresca solo cada minuto: son cifras de camiones y
 * sacos, no un mapa en vivo, y el backend ya las sirve desde caché de borde.
 */
export function useCampaignBalance(initial?: CampaignBalance) {
  return useQuery({
    queryKey: ["campaign", "balance"],
    queryFn: ({ signal }) => apiGet<CampaignBalance>("/api/campaign/balance", signal),
    refetchInterval: 60_000,
    initialData: initial,
  });
}

export interface StewardPending {
  code: string;
  donorName: string;
  items: Array<{ material: string; quantity: number; unit: string }>;
  expectedAt: number | null;
  createdAt: number;
}

export interface StewardInbox {
  site: { id: string; name: string; city: string };
  steward: { displayName: string };
  pending: StewardPending[];
  recent: Array<{
    id: string;
    items: Array<{ material: string; quantity: number; unit: string }>;
    note: string;
    receivedAt: number;
  }>;
}

/**
 * Bandeja del responsable de punto. El token viaja por cabecera y NUNCA en la
 * query string, para que no acabe en los logs del borde ni en el historial.
 */
export function useStewardInbox(token: string) {
  return useQuery({
    queryKey: ["campaign", "steward", token],
    queryFn: async () => {
      const res = await apiFetch("/api/campaign/punto", {
        headers: { [STEWARD_HEADER]: token },
      });
      if (res.status === 401) {
        throw new Error("Este enlace no es válido o fue dado de baja.");
      }
      if (!res.ok) throw new Error(`No se pudo cargar el punto (${res.status}).`);
      return (await res.json()) as StewardInbox;
    },
    refetchInterval: 60_000,
    retry: false,
  });
}

export interface ReceiptInput {
  pledgeCode?: string;
  items: PledgeItemInput[];
  note?: string;
}

export function useStewardReceipt(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ReceiptInput) =>
      apiSend<{ ok: boolean; status: string; message?: string }>(
        "POST",
        "/api/campaign/punto/recepciones",
        input,
        { [STEWARD_HEADER]: token },
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["campaign", "steward", token] }),
  });
}
