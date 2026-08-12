/**
 * DEMO volunteer fixtures cover frozen IntentKey taxonomy (WU5).
 */
import { describe, expect, it } from "vitest";
import { buildFixtures, DEMO_PREFIX } from "@/seed/fixtures";
import { INTENT_TAXONOMY, classifyVolunteerIntent } from "@/services/volunteer-analytics/classify-intent";

describe("DEMO volunteer fixtures", () => {
  it("includes DEMO-vol-* covering every IntentKey including other", () => {
    const data = buildFixtures(1_700_000_000_000);
    expect(data.volunteers.length).toBeGreaterThanOrEqual(INTENT_TAXONOMY.length);
    expect(data.volunteers.every((v) => v.id.startsWith(`${DEMO_PREFIX}vol-`))).toBe(true);

    const keys = new Set(
      data.volunteers.map(
        (v) =>
          classifyVolunteerIntent({
            fieldRole: v.fieldRole,
            offerTypes: v.offerTypes,
            digitalSkills: v.digitalSkills,
            offer: v.offer,
          }).key,
      ),
    );
    for (const entry of INTENT_TAXONOMY) {
      expect(keys.has(entry.key)).toBe(true);
    }
  });

  it("uses synthetic contacts only (no real phone patterns)", () => {
    const data = buildFixtures(1_700_000_000_000);
    for (const v of data.volunteers) {
      expect(v.contact.startsWith("+00")).toBe(true);
      expect(v.name.startsWith("DEMO ")).toBe(true);
    }
  });
});
