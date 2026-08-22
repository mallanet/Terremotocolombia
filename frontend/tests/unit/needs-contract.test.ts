import { describe, expect, it } from "vitest";
import { ContractValidationError } from "@mallanet/contracts";
import {
  adaptNeedPublicationStatus,
  readNeedPublicationStatus,
  readNeedPublishAccepted,
} from "@/lib/needs-contract";

describe("needs contract helpers", () => {
  it("reads a valid 202 acknowledgement", () => {
    expect(
      readNeedPublishAccepted({
        queued: true,
        jobId: "need-1",
      }),
    ).toEqual({ queued: true, jobId: "need-1" });
  });

  it("reads a valid status poll without citizen fields", () => {
    const parsed = readNeedPublicationStatus(
      {
        jobId: "need-1",
        state: "queued",
        progress: null,
        result: null,
        failedReason: null,
      },
      "need-1",
    );
    expect(parsed.state).toBe("queued");
    expect(JSON.stringify(parsed)).not.toMatch(/email|phone|address/i);
  });

  it("throws in test/enforce on an unknown state", () => {
    expect(() =>
      readNeedPublicationStatus(
        {
          jobId: "need-1",
          state: "running",
          progress: null,
          result: null,
          failedReason: null,
        },
        "need-1",
      ),
    ).toThrow(ContractValidationError);
  });

  it("adapter returns failed without copying extra fields", () => {
    const adapted = adaptNeedPublicationStatus({
      jobId: "need-1",
      state: "running",
      title: "should not leak",
    });
    expect(adapted.state).toBe("failed");
    expect(JSON.stringify(adapted)).not.toContain("should not leak");
  });
});
