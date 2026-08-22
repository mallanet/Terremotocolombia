import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import "../helpers";
import {
  expectedFromSchema,
  journalSha256,
} from "../../worker/schema-capability";

describe("schema capability inventory", () => {
  it("includes core and reconstruction-campaign tables", () => {
    const tables = expectedFromSchema().map((entry) => entry.table);
    expect(tables).toContain("volunteers");
    expect(tables).toContain("reports");
    expect(tables).toContain("campaign_sites");
    expect(tables).toContain("campaign_site_stewards");
    expect(tables).toContain("material_pledges");
    expect(tables).toContain("material_receipts");
    expect(tables).toContain("material_shipments");
    expect(tables).toContain("official_deceased_lists");
  });

  it("hashes the migration journal", () => {
    const journalPath = join(
      import.meta.dirname,
      "../../../infra/db/migrations/meta/_journal.json",
    );
    const digest = journalSha256(journalPath);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    const again = journalSha256(journalPath);
    expect(again).toBe(digest);
    const raw = readFileSync(journalPath);
    expect(raw.byteLength).toBeGreaterThan(0);
  });
});
