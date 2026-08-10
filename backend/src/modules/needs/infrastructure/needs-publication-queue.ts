/**
 * Productor de la cola de publicación de necesidades.
 *
 * Ya no habla con BullMQ directamente: delega en el seam de despacho
 * (`@/lib/job-dispatch`), que elige transporte por capacidad — binding de
 * Cloudflare Queues si lo hay, BullMQ si hay VALKEY_URL. Los llamadores
 * (needs-module, needs-controller) no cambian.
 *
 * El import de bullmq/ioredis desapareció de este módulo A PROPÓSITO: estaba en
 * `src/`, así que entraba en el bundle de Workers aunque allí no pueda correr.
 */
import { createHash, randomUUID } from "crypto";
import { dispatchJob, resolveTransport, type JobRoute } from "@/lib/job-dispatch";
import type { NewNeed, ResolvedLocation } from "../domain/need";

export const NEEDS_PUBLICATION_QUEUE = "needs-publication";

/**
 * Binding declarado en wrangler.jsonc para el camino de Cloudflare Queues.
 * Mientras U2 no lo declare, `resolveTransport` simplemente no lo encuentra y
 * cae a BullMQ — que es el comportamiento de hoy.
 */
export const NEEDS_PUBLICATION_BINDING = "NEEDS_QUEUE";

export const needsPublicationRoute: JobRoute = {
  queueName: NEEDS_PUBLICATION_QUEUE,
  binding: NEEDS_PUBLICATION_BINDING,
};

export interface NeedPublicationJob {
  need: NewNeed;
  location?: ResolvedLocation;
}

export interface NeedPublicationState {
  jobId: string;
  state: string;
  progress: unknown;
  result: unknown;
  failedReason: string | null;
}

function jobId(idempotencyKey?: string): string {
  if (!idempotencyKey) return `need-${randomUUID()}`;
  return `need-${createHash("sha256").update(idempotencyKey).digest("hex")}`;
}

export async function enqueueNeedPublication(
  data: NeedPublicationJob,
  idempotencyKey?: string,
): Promise<string> {
  return dispatchJob(needsPublicationRoute, data, {
    id: jobId(idempotencyKey),
    attempts: 3,
    backoffMs: 10_000,
  });
}

/**
 * Estado de una publicación.
 *
 * Solo existe en el camino BullMQ: Cloudflare Queues no lleva un registro de
 * jobs consultable, así que allí devuelve `null` en vez de fingir un estado.
 * El consumidor de Queues y su superficie de estado son U2/U3 del plan.
 */
export async function getNeedPublicationState(
  id: string,
): Promise<NeedPublicationState | null> {
  if (resolveTransport(needsPublicationRoute) !== "bullmq") return null;
  const url = process.env.VALKEY_URL;
  if (!url) return null;
  const { getBullmqJobState } = await import("@/lib/job-dispatch.bullmq");
  return getBullmqJobState(needsPublicationRoute, id, url);
}
