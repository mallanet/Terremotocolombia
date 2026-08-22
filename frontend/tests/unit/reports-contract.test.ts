import { describe, expect, it } from "vitest";
import { ContractValidationError, reportsListSchema } from "@mallanet/contracts";
import { adaptReportsList, readReportsList } from "@/lib/reports-contract";

const report = {
  id: "r1",
  type: "critical" as const,
  lat: 1,
  lng: 2,
  place: "Punto demo",
  affected: 0,
  needs: "",
  photoUrl: null,
  confirmations: 0,
  createdAt: 1,
};

describe("reports list adapter", () => {
  it("keeps a valid page unchanged", () => {
    const raw = {
      reports: [report],
      total: 1,
      page: 1,
      pageSize: 50,
      totalPages: 1,
      persistent: true,
    };
    expect(adaptReportsList(raw)).toEqual(raw);
    expect(readReportsList(raw).reports).toHaveLength(1);
  });

  it("defaults missing totalPages to 1 and drops invalid rows", () => {
    const adapted = adaptReportsList({
      reports: [report, { id: 1 }],
      total: 2,
      page: 1,
      pageSize: 50,
      persistent: true,
    });
    expect(adapted.totalPages).toBe(1);
    expect(adapted.reports).toEqual([report]);
    expect(reportsListSchema.safeParse({
      reports: [report],
      total: 2,
      page: 1,
      pageSize: 50,
      persistent: true,
    }).success).toBe(false);
  });

  it("throws in test/enforce when the live helper sees no totalPages", () => {
    expect(() =>
      readReportsList({
        reports: [report],
        total: 1,
        page: 1,
        pageSize: 50,
        persistent: true,
      }),
    ).toThrow(ContractValidationError);
  });
});
