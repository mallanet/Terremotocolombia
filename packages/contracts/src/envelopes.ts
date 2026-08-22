import { z } from "zod";

/** Marker string so a wrangler dry-run bundle can prove this package is included. */
export const CONTRACTS_PACKAGE_MARKER = "@mallanet/contracts";

export const healthOkSchema = z
  .object({
    ok: z.boolean(),
    sha: z.string().min(1),
  })
  .passthrough();

export type HealthOk = z.infer<typeof healthOkSchema>;

type PaginatedEnvelope<Row, RowsKey extends string> = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  totalCapped?: boolean;
} & { [K in RowsKey]: Row[] };

/**
 * Canonical paginated list. The row array keeps its domain wire key
 * (`reports`, not a renamed `items` key). `totalCapped` is optional so
 * missing-person lists can extend this shape.
 */
export function paginatedEnvelopeSchema<RowSchema extends z.ZodTypeAny, RowsKey extends string>(
  rowSchema: RowSchema,
  rowsKey: RowsKey,
) {
  return z.object({
    [rowsKey]: z.array(rowSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
    totalCapped: z.boolean().optional(),
  }) as unknown as z.ZodType<PaginatedEnvelope<z.infer<RowSchema>, RowsKey>>;
}

/** crud-factory unbounded list. Normalization waits for that surface to migrate. */
export function unboundedItemsSchema<ItemSchema extends z.ZodTypeAny>(itemSchema: ItemSchema) {
  return z.object({
    items: z.array(itemSchema),
  });
}

/**
 * GET /api/hospitals list. This is not paginated: the array is `hospitals`,
 * and `states` is null unless the caller asked for `include=states`.
 */
export function hospitalsBareListSchema<
  HospitalSchema extends z.ZodTypeAny,
  StateSchema extends z.ZodTypeAny,
>(hospitalSchema: HospitalSchema, stateSchema: StateSchema) {
  return z.object({
    hospitals: z.array(hospitalSchema),
    states: z.array(stateSchema).nullable(),
  });
}

export const asyncJobAcceptedSchema = z.object({
  queued: z.literal(true),
  jobId: z.string().min(1),
});

export const asyncJobStateSchema = z.enum(["queued", "completed", "failed"]);

export const asyncJobStatusSchema = z.object({
  jobId: z.string().min(1),
  state: asyncJobStateSchema,
  progress: z.unknown().nullable(),
  result: z.unknown().nullable(),
  failedReason: z.string().nullable(),
});

export type AsyncJobAccepted = z.infer<typeof asyncJobAcceptedSchema>;
export type AsyncJobState = z.infer<typeof asyncJobStateSchema>;
export type AsyncJobStatus = z.infer<typeof asyncJobStatusSchema>;
