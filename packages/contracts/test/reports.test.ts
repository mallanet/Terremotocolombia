import { describe, expect, it } from "vitest";
import {
  reportCreateResponseSchema,
  reportDtoSchema,
  reportsListSchema,
} from "../src/index";

const report = {
  id: "r1",
  type: "critical" as const,
  lat: 4.6,
  lng: -74.0,
  place: "Punto demo",
  affected: 0,
  needs: "",
  photoUrl: null,
  confirmations: 0,
  createdAt: 1,
};

describe("reports contracts", () => {
  it("parses a list page that matches the live GET /api/reports wire", () => {
    const parsed = reportsListSchema.parse({
      reports: [report],
      total: 1,
      page: 1,
      pageSize: 50,
      totalPages: 1,
      persistent: true,
    });
    expect(parsed.reports[0]?.id).toBe("r1");
    expect(parsed.persistent).toBe(true);
  });

  it("rejects a list page with no totalPages", () => {
    const result = reportsListSchema.safeParse({
      reports: [],
      total: 0,
      page: 1,
      pageSize: 50,
      persistent: true,
    });
    expect(result.success).toBe(false);
  });

  it("parses create and keeps editToken off the public DTO", () => {
    const parsed = reportCreateResponseSchema.parse({
      report,
      editToken: "synthetic-edit-token",
    });
    expect(parsed.editToken).toBe("synthetic-edit-token");
    expect(reportDtoSchema.parse(parsed.report)).not.toHaveProperty("editToken");
    expect(JSON.stringify(reportDtoSchema.parse(parsed.report))).not.toContain("synthetic-edit-token");
  });
});
