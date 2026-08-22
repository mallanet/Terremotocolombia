import { describe, expect, it } from "vitest";
import {
  errorEnvelopeSchema,
  needPublicationStatusSchema,
  needPublishAcceptedSchema,
} from "../src/index";

describe("needs contracts", () => {
  it("parses the 202 publish acknowledgement", () => {
    expect(
      needPublishAcceptedSchema.parse({
        queued: true,
        jobId: "need-00000000-0000-4000-8000-000000000000",
      }).queued,
    ).toBe(true);
  });

  it("parses status without a citizen payload", () => {
    const parsed = needPublicationStatusSchema.parse({
      jobId: "need-1",
      state: "completed",
      progress: 100,
      result: { id: "external-1", status: "pending" },
      failedReason: null,
    });
    expect(parsed.result).toEqual({ id: "external-1", status: "pending" });
    expect(JSON.stringify(parsed)).not.toMatch(/email|phone|address|title/i);
  });

  it("rejects an unknown status state", () => {
    expect(
      needPublicationStatusSchema.safeParse({
        jobId: "need-1",
        state: "running",
        progress: null,
        result: null,
        failedReason: null,
      }).success,
    ).toBe(false);
  });

  it("parses a disabled-route error without requiring code", () => {
    expect(errorEnvelopeSchema.parse({ error: "Ruta no encontrada." }).error).toBe(
      "Ruta no encontrada.",
    );
  });
});
