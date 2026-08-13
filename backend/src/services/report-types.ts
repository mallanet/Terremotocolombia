export const REPORT_TYPE_KEYS = [
  "critical",
  "need",
  "supplies",
  "shelter",
  "nopower",
  "missing",
  "building",
  "starlink",
] as const;

export type ReportType = (typeof REPORT_TYPE_KEYS)[number];

export const MAX_REPORT_PHOTO_CHARS = 1_400_000;
export const DEFAULT_REPORT_PAGE_SIZE = 500;
export const MAX_REPORT_PAGE_SIZE = 500;

export interface ReportDTO {
  id: string;
  type: ReportType;
  lat: number;
  lng: number;
  place: string;
  affected: number;
  needs: string;
  photoUrl: string | null;
  confirmations: number;
  createdAt: number;
}

export interface CreateReportInput {
  type: ReportType;
  lat: number;
  lng: number;
  place: string;
  affected?: number;
  needs?: string;
  photo?: string | null;
  volunteerId?: string | null;
}

export interface ReportPage {
  reports: ReportDTO[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PhotoData {
  contentType: string;
  buffer: Buffer;
}

export interface RemotePhoto {
  redirectTo: string;
}

export interface UpdateReportInput {
  type?: ReportType;
  lat?: number;
  lng?: number;
  place?: string;
  affected?: number;
  needs?: string;
}
