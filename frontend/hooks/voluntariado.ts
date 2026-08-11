"use client";

/**
 * Hooks del dominio "voluntariado" (la página pública del voluntario
 * asignado, /voluntariado/<token>). Mismo patrón canónico que hooks/contact:
 * TanStack Query + apiGet/apiSend; nada de fetch a mano en componentes.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiSend } from "@/lib/api";

export interface AssignmentTask {
  id: string;
  title: string;
  description: string;
  kind: string;
  city: string | null;
  originName: string | null;
  originLat: number | null;
  originLng: number | null;
  destName: string | null;
  destLat: number | null;
  destLng: number | null;
  transportNote: string | null;
  status: string;
}

export type AssignmentStatus = "offered" | "accepted" | "done" | "declined";

export interface AssignmentDetail {
  status: AssignmentStatus;
  volunteerName: string;
  task: AssignmentTask;
}

export type AssignmentAction = "aceptar" | "rechazar" | "terminar";

export function useAssignment(token: string) {
  return useQuery({
    queryKey: ["voluntariado", token],
    queryFn: ({ signal }) => apiGet<AssignmentDetail>(`/api/voluntariado/${token}`, signal),
    retry: false,
    staleTime: 0,
  });
}

export function useAssignmentRespond(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: AssignmentAction) =>
      apiSend<{ ok: boolean; status: AssignmentStatus; taskStatus: string }>(
        "POST",
        `/api/voluntariado/${token}/responder`,
        { action },
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["voluntariado", token] }),
  });
}
