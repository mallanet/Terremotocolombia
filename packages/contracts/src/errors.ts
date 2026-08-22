import { z } from "zod";

/**
 * Additive error envelope. Old clients read `error`. New clients may read
 * optional `code` (for example `module_disabled`).
 */
export const errorEnvelopeSchema = z.object({
  error: z.string(),
  code: z.string().min(1).optional(),
});

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
