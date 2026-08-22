import { describe, expect, it } from "vitest";
import { errorEnvelopeSchema, healthOkSchema, paginatedEnvelopeSchema } from "@mallanet/contracts";
import { z } from "zod";

describe("shared contracts package", () => {
  it("parses the reports list envelope used by the public site", () => {
    const schema = paginatedEnvelopeSchema(z.object({ id: z.string() }), "reports");
    const parsed = schema.parse({
      reports: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    });
    expect(parsed.totalPages).toBe(1);
  });

  it("parses an additive error envelope", () => {
    expect(errorEnvelopeSchema.parse({ error: "not found", code: "module_disabled" }).code).toBe(
      "module_disabled",
    );
  });

  it("parses a health payload", () => {
    expect(healthOkSchema.parse({ ok: true, sha: "dev" }).ok).toBe(true);
  });
});
