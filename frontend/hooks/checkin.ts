"use client";

import { useMutation } from "@tanstack/react-query";
import { apiSend } from "@/lib/api";

export interface CheckinInput {
  code: string;
  place: string;
  note?: string;
  photo?: string | null;
  availability?: string;
  talent?: string;
  area?: string;
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
