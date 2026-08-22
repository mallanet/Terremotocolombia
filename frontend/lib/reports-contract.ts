import { reportDtoSchema, reportsListSchema, type ReportsList } from "@mallanet/contracts";
import { readApiContract } from "@/lib/contract-validation";

const REPORT_LIST_ENDPOINT = "GET /api/reports";

function asRecord(raw: unknown): Record<string, unknown> {
  return raw !== null && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

function asFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * Documented defaults when GET /api/reports fails validation in report mode.
 * Missing `totalPages` becomes 1 so pagination cannot read undefined.
 * Rows that do not match the DTO are dropped. Never casts `raw` to ReportsList.
 */
export function adaptReportsList(raw: unknown): ReportsList {
  const value = asRecord(raw);
  const reports = Array.isArray(value.reports)
    ? value.reports.flatMap((row) => {
        const parsed = reportDtoSchema.safeParse(row);
        return parsed.success ? [parsed.data] : [];
      })
    : [];
  const pageSize = Math.max(1, Math.trunc(asFiniteNumber(value.pageSize, 500)));
  const total = Math.max(0, Math.trunc(asFiniteNumber(value.total, reports.length)));
  const totalPages = Math.max(
    1,
    Math.trunc(asFiniteNumber(value.totalPages, 1)),
  );
  return {
    reports,
    total,
    page: Math.max(1, Math.trunc(asFiniteNumber(value.page, 1))),
    pageSize,
    totalPages,
    persistent: value.persistent === true,
  };
}

export function readReportsList(raw: unknown, endpoint = REPORT_LIST_ENDPOINT): ReportsList {
  return readApiContract(reportsListSchema, raw, endpoint, adaptReportsList);
}
