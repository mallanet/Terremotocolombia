import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  ContractValidationError,
  getContractValidationMode,
  readContract,
  validateContract,
} from "../src/validate";

const schema = z.object({ id: z.string() });

describe("getContractValidationMode", () => {
  it("enforces in development and test", () => {
    expect(getContractValidationMode({ NODE_ENV: "test" })).toBe("enforce");
    expect(getContractValidationMode({ NODE_ENV: "development" })).toBe("enforce");
  });

  it("reports in production unless the flag is enforce", () => {
    expect(getContractValidationMode({ NODE_ENV: "production" })).toBe("report");
    expect(
      getContractValidationMode({
        NODE_ENV: "production",
        NEXT_PUBLIC_CONTRACT_VALIDATION_MODE: "enforce",
      }),
    ).toBe("enforce");
  });
});

describe("validateContract", () => {
  it("passes a valid payload through in both modes", () => {
    const onMismatch = vi.fn();
    for (const mode of ["report", "enforce"] as const) {
      const result = validateContract(schema, { id: "a" }, {
        endpoint: "GET /api/example",
        mode,
        onMismatch,
      });
      expect(result).toEqual({ valid: true, data: { id: "a" } });
    }
    expect(onMismatch).not.toHaveBeenCalled();
  });

  it("returns the invalid branch and emits one mismatch event in report mode", () => {
    const onMismatch = vi.fn();
    const result = validateContract(schema, { id: 1 }, {
      endpoint: "GET /api/example",
      mode: "report",
      onMismatch,
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.raw).toEqual({ id: 1 });
      expect(result.issues).toContain("id");
    }
    expect(onMismatch).toHaveBeenCalledTimes(1);
    expect(onMismatch).toHaveBeenCalledWith({
      endpoint: "GET /api/example",
      issuePaths: ["id"],
    });
    const event = onMismatch.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(event).not.toHaveProperty("body");
    expect(event).not.toHaveProperty("payload");
    expect(event).not.toHaveProperty("url");
    expect(event).not.toHaveProperty("query");
    expect(event).not.toHaveProperty("token");
    expect(JSON.stringify(event)).not.toContain("secret");
  });

  it("does not cast raw to the contract type", () => {
    const result = validateContract(schema, { id: 1 }, {
      endpoint: "GET /api/example",
      mode: "report",
    });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.raw).toEqual({ id: 1 });
    }
  });
});

describe("readContract", () => {
  it("uses the adapter in report mode and throws in enforce mode", () => {
    const adapt = vi.fn((raw: unknown) => {
      const value = raw as { id?: unknown };
      return { id: typeof value.id === "string" ? value.id : "unknown" };
    });
    const reported = readContract(schema, { id: 1 }, {
      endpoint: "GET /api/example",
      mode: "report",
      adapt,
    });
    expect(reported).toEqual({ id: "unknown" });
    expect(adapt).toHaveBeenCalledTimes(1);

    expect(() =>
      readContract(schema, { id: 1 }, {
        endpoint: "GET /api/example",
        mode: "enforce",
        adapt,
      }),
    ).toThrow(ContractValidationError);
    expect(adapt).toHaveBeenCalledTimes(1);
  });
});
