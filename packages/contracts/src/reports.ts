import { z } from "zod";

export const reportTypeSchema = z.enum([
  "critical",
  "need",
  "supplies",
  "shelter",
  "nopower",
  "missing",
  "building",
  "starlink",
]);

export type ReportType = z.infer<typeof reportTypeSchema>;

/** Public report DTO. No embedded photo bytes. No edit token. */
export const reportDtoSchema = z.object({
  id: z.string().min(1),
  type: reportTypeSchema,
  lat: z.number().finite(),
  lng: z.number().finite(),
  place: z.string(),
  affected: z.number(),
  needs: z.string(),
  photoUrl: z.string().nullable(),
  confirmations: z.number().int().nonnegative(),
  createdAt: z.number(),
});

export type ReportDto = z.infer<typeof reportDtoSchema>;

/** GET /api/reports. Canonical page plus `persistent`. */
export const reportsListSchema = z.object({
  reports: z.array(reportDtoSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
  persistent: z.boolean(),
});

export type ReportsList = z.infer<typeof reportsListSchema>;

export const reportDetailSchema = z.object({
  report: reportDtoSchema,
});

export type ReportDetail = z.infer<typeof reportDetailSchema>;

/** POST /api/reports 201. `editToken` is request-scoped; never log or cache it. */
export const reportCreateResponseSchema = z.object({
  report: reportDtoSchema,
  editToken: z.string().min(1),
});

export type ReportCreateResponse = z.infer<typeof reportCreateResponseSchema>;

export const reportEditResponseSchema = z.object({
  report: reportDtoSchema,
});

export const reportConfirmOkSchema = z.object({
  ok: z.literal(true),
  confirmations: z.number().int().nonnegative(),
});

export const reportConfirmDuplicateSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
});
