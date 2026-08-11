/**
 * Consumidor de Cloudflare Queues — lógica extraída de `src/worker.ts` para
 * poder testearla (worker.ts importa `cloudflare:node` en ámbito de módulo y
 * no se puede cargar desde un test; mismo motivo que services/cron-jobs.ts).
 *
 * Dos colas, un solo Worker (U2/U3 del plan de port de colas):
 *
 *  - `…-needs[…]`      publicación de necesidades → ResponseGrid. Ack POR
 *    MENSAJE: un mensaje envenenado no fuerza la reentrega de sus compañeros
 *    de lote. Un fallo hace `retry()` y Queues aplica max_retries/DLQ (KTD4).
 *  - `…-needs-dlq[…]`  cartas muertas. Se PERSISTEN en `audit_log`
 *    (action `queue.dead_letter`) — sin migración (KTD5), duraderas más allá
 *    de los 4 días de retención del DLQ, e inspeccionables por la superficie
 *    de auditoría existente (`/api/public/audit`, gateada por audit:read) o
 *    la pantalla Auditoría del panel. El ack aquí es INCONDICIONAL: un fallo
 *    al persistir no debe dead-letterear la carta muerta.
 */
import { getDb, schema } from "@/db";
import type { NeedPublicationJob } from "@/modules/needs/infrastructure/needs-publication-queue";

/** Forma mínima del mensaje que entrega el runtime de Queues. */
export interface IncomingQueueMessage {
  id: string;
  body: unknown;
  attempts?: number;
  ack(): void;
  retry(options?: { delaySeconds?: number }): void;
}

/** Forma mínima del batch que entrega el runtime de Queues. */
export interface IncomingQueueBatch {
  queue: string;
  messages: readonly IncomingQueueMessage[];
}

export type QueueKind = "needs" | "needs-dlq" | "unknown";

/**
 * Clasifica una cola por su nombre. Cubre los cuatro nombres reales
 * (terremotocolombia-needs[-staging] y terremotocolombia-needs-dlq[-staging])
 * sin acoplarse al prefijo, y lo desconocido se reporta como tal.
 */
export function classifyQueue(name: string): QueueKind {
  if (name.includes("-needs-dlq")) return "needs-dlq";
  if (name.includes("-needs")) return "needs";
  return "unknown";
}

export interface NeedsConsumerDeps {
  /** Publica una necesidad (inyectable para tests; en prod, publishNeed). */
  publish(job: NeedPublicationJob): Promise<unknown>;
}

/** Procesa un batch de publicaciones. Ack por mensaje; fallo → retry(). */
export async function consumeNeedsBatch(
  batch: IncomingQueueBatch,
  deps: NeedsConsumerDeps,
): Promise<void> {
  for (const message of batch.messages) {
    try {
      await deps.publish(message.body as NeedPublicationJob);
      message.ack();
    } catch (err) {
      console.error(
        `[queue:needs] mensaje ${message.id} falló (intento ${message.attempts ?? "?"}):`,
        err instanceof Error ? err.message : String(err),
      );
      message.retry();
    }
  }
}

export interface DeadLetterEntry {
  queue: string;
  messageId: string;
  attempts: number | null;
  payload: unknown;
}

export type PersistDeadLetter = (entry: DeadLetterEntry) => Promise<void>;

/**
 * Persiste una carta muerta en la bitácora de auditoría. Reusa la forma del
 * registro de worker/deadletter.ts (cola, id, intentos, payload) sobre la
 * tabla existente — sin transporte Redis y sin migración.
 */
export async function persistDeadLetter(entry: DeadLetterEntry): Promise<void> {
  await getDb()
    .insert(schema.auditLog)
    .values({
      actorUserId: null,
      action: "queue.dead_letter",
      targetType: "queue",
      targetId: entry.queue,
      metadata: {
        messageId: entry.messageId,
        attempts: entry.attempts,
        reason: "reintentos agotados (max_retries)",
        payload: entry.payload,
      },
      ipHash: null,
      createdAt: Date.now(),
    });
}

/** Procesa un batch del DLQ: persistir y SIEMPRE ack (nunca reencolar). */
export async function consumeDlqBatch(
  batch: IncomingQueueBatch,
  persist: PersistDeadLetter,
): Promise<void> {
  for (const message of batch.messages) {
    try {
      await persist({
        queue: batch.queue,
        messageId: message.id,
        attempts: message.attempts ?? null,
        payload: message.body,
      });
    } catch (err) {
      // Visible y accionable, pero sin tumbar el ack: perder el registro es
      // mejor que un bucle infinito de reentrega de la propia carta muerta.
      console.error(
        `[queue:dlq] no se pudo persistir la carta muerta ${message.id}:`,
        err instanceof Error ? err.message : String(err),
      );
    }
    message.ack();
  }
}
