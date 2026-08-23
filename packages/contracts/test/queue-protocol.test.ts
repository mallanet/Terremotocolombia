import { describe, expect, it } from "vitest";
import {
  QUEUE_PROTOCOL_FIXTURES,
  importJobV1Schema,
  matcherJobV1Schema,
  needsJobV1Schema,
  queueEnvelopeV2Schema,
} from "../src/index";

describe("queue protocol fixtures", () => {
  it("parses the live v1 needs body, including empty {}", () => {
    expect(needsJobV1Schema.parse(QUEUE_PROTOCOL_FIXTURES.needsV1).jobId).toBe(
      "need-demo-1",
    );
    expect(needsJobV1Schema.parse(QUEUE_PROTOCOL_FIXTURES.needsV1Empty)).toEqual(
      {},
    );
  });

  it("parses v1 import and matcher bodies", () => {
    expect(importJobV1Schema.parse(QUEUE_PROTOCOL_FIXTURES.importsV1).mode).toBe(
      "process",
    );
    expect(matcherJobV1Schema.parse(QUEUE_PROTOCOL_FIXTURES.matcherV1).prn).toBe(
      "PRN-DEMO-0001",
    );
  });

  it("parses v2 envelopes for every family", () => {
    for (const fixture of [
      QUEUE_PROTOCOL_FIXTURES.needsV2,
      QUEUE_PROTOCOL_FIXTURES.importsV2,
      QUEUE_PROTOCOL_FIXTURES.matcherV2,
      QUEUE_PROTOCOL_FIXTURES.needsV2OtherTenant,
    ]) {
      const parsed = queueEnvelopeV2Schema.parse(fixture);
      expect(parsed.schemaVersion).toBe(2);
      expect(parsed.organizationId.length).toBeGreaterThan(0);
    }
  });

  it("rejects an unsupported schemaVersion as a v2 envelope", () => {
    expect(
      queueEnvelopeV2Schema.safeParse(QUEUE_PROTOCOL_FIXTURES.unsupportedVersion)
        .success,
    ).toBe(false);
  });

  it("keeps fixtures free of citizen contact fields", () => {
    expect(JSON.stringify(QUEUE_PROTOCOL_FIXTURES)).not.toMatch(
      /email|phone|address|document/i,
    );
  });
});
