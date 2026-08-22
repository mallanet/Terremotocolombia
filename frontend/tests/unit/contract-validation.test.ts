import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("@/lib/openpanel", () => ({
  trackOperationalEvent: vi.fn(),
}));

import { trackOperationalEvent } from "@/lib/openpanel";
import { reportContractMismatch, validateApiContract } from "@/lib/contract-validation";

describe("frontend contract telemetry", () => {
  it("emits endpoint and issue paths only", () => {
    validateApiContract(z.object({ id: z.string() }), { id: 1 }, "GET /api/example");
    expect(trackOperationalEvent).toHaveBeenCalledTimes(1);
    const [, properties] = vi.mocked(trackOperationalEvent).mock.calls[0] ?? [];
    expect(properties).toMatchObject({
      kind: "contract",
      classification: "contract_mismatch",
      endpoint: "GET /api/example",
      issue_paths: ["id"],
    });
    const serialized = JSON.stringify(properties);
    expect(serialized).not.toMatch(/body|payload|query|token|https?:\/\//i);
  });

  it("does not put raw payloads on the mismatch event", () => {
    reportContractMismatch({
      endpoint: "GET /api/example",
      issuePaths: ["reports", "totalPages"],
    });
    const last = vi.mocked(trackOperationalEvent).mock.calls.at(-1)?.[1];
    expect(last).not.toHaveProperty("raw");
    expect(last).not.toHaveProperty("body");
  });
});
