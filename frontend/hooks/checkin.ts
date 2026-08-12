"use client";

/**
 * Hook del check-in de voluntario (código único + lugar + qué dejó + foto).
 * Mismo patrón canónico que hooks/volunteers.ts: useMutation + apiSend.
 */
import { useMutation } from "@tanstack/react-query";
import { apiSend } from "@/lib/api";

export interface CheckinInput {
  code: string;
  place: string;
  note?: string;
  photo?: string | null;
  turnstileToken?: string;
}

export interface CheckinResponse {
  ok?: boolean;
  id?: string;
}

export function useCheckinSubmit() {
  return useMutation({
    mutationFn: (input: CheckinInput) =>
      apiSend<CheckinResponse>("POST", "/api/voluntariado/checkin", input),
  });
}
