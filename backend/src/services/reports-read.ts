import { desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { cached } from "@/lib/cache";
import {
  DEFAULT_REPORT_PAGE_SIZE,
  MAX_REPORT_PAGE_SIZE,
  REPORT_LIST_CACHE_MS,
  REPORT_TYPE_KEYS,
  type ReportDTO,
  type ReportPage,
  type ReportType,
} from "@/services/report-types";

const { reports } = schema;

export { isAllowedImageDataUrl as isValidPhotoDataUrl } from "@/lib/image";

export function isPersistent(): boolean {
  return true;
}

function reportSelection() {
  return {
    id: reports.id,
    type: reports.type,
    lat: reports.lat,
    lng: reports.lng,
    place: reports.place,
    affected: reports.affected,
    needs: reports.needs,
    hasPhoto: sql<boolean>`${reports.photo} IS NOT NULL`,
    confirmations: reports.confirmations,
    createdAt: reports.createdAt,
  };
}

type ReportRow = {
  id: string;
  type: string;
  lat: number;
  lng: number;
  place: string;
  affected: number;
  needs: string;
  hasPhoto: boolean;
  confirmations: number | null;
  createdAt: number;
};

export function reportRowToDto(row: ReportRow): ReportDTO {
  return {
    id: row.id,
    type: row.type as ReportType,
    lat: Number(row.lat),
    lng: Number(row.lng),
    place: row.place,
    affected: Number(row.affected),
    needs: row.needs,
    photoUrl: row.hasPhoto ? `/api/reports/${row.id}/photo` : null,
    confirmations: Number(row.confirmations ?? 0),
    createdAt: Number(row.createdAt),
  };
}

async function selectReportRows(limit?: number, offset = 0) {
  const db = await getDb();
  const query = db
    .select(reportSelection())
    .from(reports)
    .orderBy(desc(reports.createdAt));
  return limit === undefined ? query : query.limit(limit).offset(offset);
}

async function selectReportPageRows(limit: number, offset: number) {
  const db = await getDb();
  return db
    .select({
      ...reportSelection(),
      total: sql<number>`(count(*) over())::int`,
    })
    .from(reports)
    .orderBy(desc(reports.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function listReports(): Promise<ReportDTO[]> {
  const rows = await cached("reports:all", REPORT_LIST_CACHE_MS, () =>
    selectReportRows(),
  );
  return rows
    .filter((row) => REPORT_TYPE_KEYS.includes(row.type as ReportType))
    .map(reportRowToDto);
}

export async function listReportsPage(
  page = 1,
  pageSize = DEFAULT_REPORT_PAGE_SIZE,
): Promise<ReportPage> {
  const safePage = Math.max(1, Math.trunc(page));
  const safePageSize = Math.min(
    MAX_REPORT_PAGE_SIZE,
    Math.max(1, Math.trunc(pageSize)),
  );
  return cached(
    `reports:page:${safePage}:${safePageSize}`,
    REPORT_LIST_CACHE_MS,
    async () => {
      const db = await getDb();
      const rows = await selectReportPageRows(
        safePageSize,
        (safePage - 1) * safePageSize,
      );
      // A window count removes the second Neon HTTP request for every populated
      // page. An empty out-of-range page has no row carrying the window value, so
      // keep the old count query as a correctness fallback for that rare case.
      const total = rows[0]
        ? Number(rows[0].total)
        : Number(
            (await db.select({ total: sql<number>`count(*)::int` }).from(reports))[0]
              ?.total ?? 0,
          );
      return {
        reports: rows
          .filter((row) => REPORT_TYPE_KEYS.includes(row.type as ReportType))
          .map(reportRowToDto),
        total,
        page: safePage,
        pageSize: safePageSize,
        totalPages: Math.max(1, Math.ceil(total / safePageSize)),
      };
    },
  );
}

export async function getReportById(id: string): Promise<ReportDTO | null> {
  const db = await getDb();
  const rows = await db
    .select(reportSelection())
    .from(reports)
    .where(eq(reports.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return reportRowToDto(row);
}
