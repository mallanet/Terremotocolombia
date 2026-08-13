"use client";

import { apiFetch } from "@/lib/api";
import type { QueuedPayload } from "@/lib/offline-queue";
import type { EmergencyReport } from "@/lib/types";

export interface ReportSubmission extends QueuedPayload {
  /** One-use proof for the current request. Never persist this in the offline queue. */
  turnstileToken?: string;
}

interface PostReportOptions {
  humanVerificationEnabled?: boolean;
}

const HUMAN_VERIFICATION_ENABLED = Boolean(
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
);

export type SubmitOutcome =
  | { status: "ok"; report?: EmergencyReport }
  | { status: "queue" }
  | { status: "drop"; error: string };

export async function postReportToServer(
  payload: ReportSubmission,
  options: PostReportOptions = {},
): Promise<SubmitOutcome> {
  const humanVerificationEnabled =
    options.humanVerificationEnabled ?? HUMAN_VERIFICATION_ENABLED;
  let res: Response;
  try {
    res = await apiFetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    if (humanVerificationEnabled) {
      return {
        status: "drop",
        error:
          "No se pudo conectar y el reporte no se guardó. Conserva este formulario abierto y reintenta cuando vuelva la conexión.",
      };
    }
    return { status: "queue" };
  }
  if (res.ok) {
    const data = await res.json().catch(() => ({}));
    return { status: "ok", report: data.report };
  }
  const data = await res.json().catch(() => ({}));
  // Turnstile tokens are single-use and expire after five minutes. Once the
  // server has answered, a background retry cannot safely reuse the proof.
  // Keep the form open and report the failure instead of claiming the report
  // was saved and silently dropping it after the retry receives 403.
  if (
    !humanVerificationEnabled &&
    (res.status === 429 || res.status === 503)
  ) {
    return { status: "queue" };
  }
  return {
    status: "drop",
    error: data.error ?? "No se pudo publicar la alerta.",
  };
}
