import { describe, expect, it, vi } from "vitest";
import { fetchAllReportPages, type ReportsResponse } from "@/hooks/emergency";
import type { EmergencyReport } from "@/lib/types";

function report(id: string): EmergencyReport {
  return {
    id,
    type: "critical",
    lat: 1,
    lng: 2,
    place: `Punto ${id}`,
    affected: 0,
    needs: "",
    photoUrl: null,
    confirmations: 0,
    createdAt: 1,
  };
}

function page(number: number, reports: EmergencyReport[]): ReportsResponse {
  return {
    reports,
    persistent: true,
    total: 501,
    page: number,
    pageSize: 500,
    totalPages: 2,
  };
}

describe("fetchAllReportPages", () => {
  it("entrega al mapa también los reportes posteriores a los primeros 500", async () => {
    const fetchPage = vi.fn(async (number: number) =>
      number === 1
        ? page(1, Array.from({ length: 500 }, (_, index) => report(`r-${index}`)))
        : page(2, [report("r-500")]),
    );

    const result = await fetchAllReportPages(fetchPage);

    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 1, undefined);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 2, undefined);
    expect(result.reports).toHaveLength(501);
    expect(result.reports.at(-1)?.id).toBe("r-500");
  });

  it("deduplica ids si una inserción mueve el offset entre páginas", async () => {
    const fetchPage = vi.fn(async (number: number) =>
      number === 1
        ? page(1, [report("newest"), report("boundary")])
        : page(2, [report("boundary"), report("oldest")]),
    );

    const result = await fetchAllReportPages(fetchPage);
    expect(result.reports.map(({ id }) => id)).toEqual(["newest", "boundary", "oldest"]);
  });
});
