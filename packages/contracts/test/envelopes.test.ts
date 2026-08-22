import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import {
  asyncJobAcceptedSchema,
  asyncJobStateSchema,
  asyncJobStatusSchema,
  errorEnvelopeSchema,
  healthOkSchema,
  paginatedEnvelopeSchema,
  unboundedItemsSchema,
} from "../src/index";

describe("paginated envelope", () => {
  const schema = paginatedEnvelopeSchema(z.object({ id: z.string() }), "reports");

  it("parses a conforming payload and infers the row array key", () => {
    const parsed = schema.parse({
      reports: [{ id: "r1" }],
      total: 1,
      page: 1,
      pageSize: 50,
      totalPages: 1,
    });
    expect(parsed.reports).toEqual([{ id: "r1" }]);
    expectTypeOf(parsed.reports).toEqualTypeOf<Array<{ id: string }>>();
    expectTypeOf(parsed.totalPages).toEqualTypeOf<number>();
  });

  it("accepts optional totalCapped", () => {
    const parsed = schema.parse({
      reports: [],
      total: 0,
      page: 1,
      pageSize: 50,
      totalPages: 1,
      totalCapped: true,
    });
    expect(parsed.totalCapped).toBe(true);
  });

  it("rejects a payload with no totalPages", () => {
    const result = schema.safeParse({
      reports: [],
      total: 0,
      page: 1,
      pageSize: 50,
    });
    expect(result.success).toBe(false);
  });
});

describe("async-job envelope", () => {
  it("accepts a 202 queued acknowledgement", () => {
    expect(
      asyncJobAcceptedSchema.parse({
        queued: true,
        jobId: "need-00000000-0000-4000-8000-000000000000",
      }).queued,
    ).toBe(true);
  });

  it("accepts each known status state", () => {
    for (const state of ["queued", "completed", "failed"] as const) {
      expect(asyncJobStateSchema.parse(state)).toBe(state);
      expect(
        asyncJobStatusSchema.parse({
          jobId: "need-1",
          state,
          progress: null,
          result: null,
          failedReason: state === "failed" ? "provider_unavailable" : null,
        }).state,
      ).toBe(state);
    }
  });

  it("rejects an unknown status state", () => {
    const result = asyncJobStatusSchema.safeParse({
      jobId: "need-1",
      state: "running",
      progress: null,
      result: null,
      failedReason: null,
    });
    expect(result.success).toBe(false);
  });
});

describe("error envelope", () => {
  it("parses an error without a code", () => {
    expect(errorEnvelopeSchema.parse({ error: "not found" })).toEqual({
      error: "not found",
    });
  });

  it("parses an error with an optional code", () => {
    expect(
      errorEnvelopeSchema.parse({ error: "module off", code: "module_disabled" }),
    ).toEqual({ error: "module off", code: "module_disabled" });
  });
});

describe("legacy and health shapes", () => {
  it("accepts crud-factory unbounded items", () => {
    expect(
      unboundedItemsSchema(z.object({ id: z.string() })).parse({
        items: [{ id: "a" }],
      }).items,
    ).toEqual([{ id: "a" }]);
  });

  it("parses health payloads and extra readiness fields", () => {
    expect(healthOkSchema.parse({ ok: true, sha: "dev" })).toMatchObject({
      ok: true,
      sha: "dev",
    });
    expect(healthOkSchema.parse({ ok: true, sha: "abc", r2: false })).toMatchObject({
      r2: false,
    });
  });
});
