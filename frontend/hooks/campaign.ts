"use client";

/**
 * Hooks de datos de la campaña de reconstrucción. Mismo patrón canónico que
 * hooks/contact.ts: la mutación va por apiSend y el componente no hace fetch.
 */
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiGet, apiSend } from "@/lib/api";
import type { CampaignBalance, MaterialKey } from "@/lib/campaign-materials";

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
