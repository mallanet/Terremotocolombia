"use client";

// Mutación para publicar una necesidad (POST /api/needs), con sus catálogos de UI.
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiGet, apiSend } from "@/lib/api";
import { qk } from "@/lib/query-keys";

export const NEED_PRIORITIES = [
  { value: "urgent", label: "Urgente" },
  { value: "high", label: "Alta" },
  { value: "medium", label: "Media" },
  { value: "low", label: "Baja" },
] as const;

export const NEED_CATEGORIES = [
  { value: "food", label: "Alimentos" },
  { value: "water", label: "Agua" },
  { value: "medicines", label: "Medicinas" },
  { value: "medical_supplies", label: "Insumos médicos" },
  { value: "medical_equipment", label: "Equipo médico" },
  { value: "medical_personnel", label: "Personal médico" },
  { value: "medical", label: "Atención médica" },
  { value: "hygiene", label: "Higiene" },
  { value: "clothing", label: "Ropa" },
  { value: "shelter", label: "Refugio" },
  { value: "tools", label: "Herramientas" },
  { value: "other", label: "Otro" },
] as const;

export type NeedPriority = (typeof NEED_PRIORITIES)[number]["value"];
export type NeedCategory = (typeof NEED_CATEGORIES)[number]["value"];

export interface NeedItemInput {
  name: string;
  quantity: number;
  unit?: string;
  category: NeedCategory;
}

/** Contacto opcional del solicitante. */
export interface NeedAuthorInput {
  name?: string;
  email?: string;
  phone?: string;
  note?: string;
}

export interface PublishNeedInput {
  title: string;
  description?: string;
  priority: NeedPriority;
  address: string;
  items: NeedItemInput[];
  author?: NeedAuthorInput;
  turnstileToken?: string; // prueba de humanidad (Turnstile) para el backend
}

export interface PublishNeedResult {
  queued: true;
  jobId: string;
}

export interface NeedPublicationState {
  jobId: string;
  state: string;
  progress: unknown;
  result: { id: string; status: string } | null;
  failedReason: string | null;
}

export function usePublishNeed() {
  return useMutation({
    mutationFn: async (input: PublishNeedInput) => {
      const result = await apiSend<PublishNeedResult>(
        "POST",
        "/api/needs",
        input,
      );
      if (result.queued !== true || !result.jobId) {
        throw new Error("La API no confirmó que la publicación quedó en cola.");
      }
      return result;
    },
  });
}

const TERMINAL_NEED_STATES = new Set(["completed", "failed"]);

/** Sigue el job encolado hasta que el backend confirma éxito o fallo. */
export function useNeedPublicationStatus(jobId: string | null) {
  return useQuery({
    queryKey: qk.needs.publication(jobId),
    queryFn: ({ signal }) =>
      apiGet<NeedPublicationState>(
        `/api/needs/status/${encodeURIComponent(jobId ?? "")}`,
        signal,
      ),
    enabled: Boolean(jobId),
    refetchInterval: (query) =>
      query.state.data && TERMINAL_NEED_STATES.has(query.state.data.state)
        ? false
        : 2_000,
  });
}
