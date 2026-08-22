import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { ContractValidationError } from "@mallanet/contracts";
import {
  readAdminContract,
  setContractMismatchReporter,
  validateAdminContract,
} from "@/src/shared/http/contract-validation";

describe("admin contract validation", () => {
  afterEach(() => {
    setContractMismatchReporter(() => undefined);
  });

  it("notifies the reporter with endpoint and issue paths only", () => {
    const events: unknown[] = [];
    setContractMismatchReporter((event) => events.push(event));
    validateAdminContract(z.object({ id: z.string() }), { id: 1 }, "GET /api/admin/example");
    expect(events).toEqual([
      { endpoint: "GET /api/admin/example", issuePaths: ["id"] },
    ]);
    expect(JSON.stringify(events)).not.toMatch(/body|payload|token/i);
  });

  it("throws in enforce mode when the caller uses readAdminContract", () => {
    expect(() =>
      readAdminContract(
        z.object({ id: z.string() }),
        { id: 1 },
        "GET /api/admin/example",
        () => ({ id: "unknown" }),
      ),
    ).toThrow(ContractValidationError);
  });
});
