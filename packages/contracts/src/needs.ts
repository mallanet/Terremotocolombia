import { z } from "zod";
import {
  asyncJobAcceptedSchema,
  asyncJobStateSchema,
  asyncJobStatusSchema,
} from "./envelopes";

/** POST /api/needs 202. Same shape as the shared async-job envelope. */
export const needPublishAcceptedSchema = asyncJobAcceptedSchema;

export type NeedPublishAccepted = z.infer<typeof needPublishAcceptedSchema>;

/** Public result only: external id and status. Never a citizen payload. */
export const needPublicationResultSchema = z
  .object({
    id: z.string().min(1),
    status: z.string().min(1),
  })
  .nullable();

export const needPublicationStatusSchema = asyncJobStatusSchema.extend({
  state: asyncJobStateSchema,
  result: needPublicationResultSchema,
});

export type NeedPublicationStatus = z.infer<typeof needPublicationStatusSchema>;
