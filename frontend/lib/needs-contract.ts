import {
  needPublicationStatusSchema,
  needPublishAcceptedSchema,
  type NeedPublicationStatus,
  type NeedPublishAccepted,
} from "@mallanet/contracts";
import { readApiContract } from "@/lib/contract-validation";

export function adaptNeedPublishAccepted(raw: unknown): NeedPublishAccepted {
  const value = raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const jobId = typeof value.jobId === "string" ? value.jobId : "";
  if (value.queued === true && jobId.length > 0) {
    return { queued: true, jobId };
  }
  return { queued: true, jobId: "invalid" };
}

export function adaptNeedPublicationStatus(raw: unknown): NeedPublicationStatus {
  const value = raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const jobId = typeof value.jobId === "string" ? value.jobId : "unknown";
  return {
    jobId,
    state: "failed",
    progress: null,
    result: null,
    failedReason: "invalid_status",
  };
}

export function readNeedPublishAccepted(raw: unknown): NeedPublishAccepted {
  return readApiContract(
    needPublishAcceptedSchema,
    raw,
    "POST /api/needs",
    adaptNeedPublishAccepted,
  );
}

export function readNeedPublicationStatus(
  raw: unknown,
  jobId: string,
): NeedPublicationStatus {
  return readApiContract(
    needPublicationStatusSchema,
    raw,
    `GET /api/needs/status/${jobId}`,
    adaptNeedPublicationStatus,
  );
}
