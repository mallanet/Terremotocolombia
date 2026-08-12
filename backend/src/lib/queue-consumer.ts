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

export type QueueKind =
  | "needs"
  | "needs-dlq"
  | "imports"
  | "imports-dlq"
  | "matcher"
  | "matcher-dlq"
  | "unknown";

/**
 * Clasifica una cola por su nombre. Cubre los nombres reales
 * (terremotocolombia-{needs,imports,matcher}[-dlq][-staging]) sin acoplarse
 * al prefijo, y lo desconocido se reporta como tal. El DLQ de cada familia se
 * comprueba ANTES que la familia (mismo motivo en las tres): "-matcher" es
 * substring de "-matcher-dlq".
 */
export function classifyQueue(name: string): QueueKind {
  if (name.includes("-needs-dlq")) return "needs-dlq";
  if (name.includes("-needs")) return "needs";
  if (name.includes("-imports-dlq")) return "imports-dlq";
  if (name.includes("-imports")) return "imports";
  if (name.includes("-matcher-dlq")) return "matcher-dlq";
  if (name.includes("-matcher")) return "matcher";
  return "unknown";
}

export interface NeedsConsumerDeps {
  /** Publica una necesidad (inyectable para tests; en prod, publishNeed). */
  publish(job: NeedPublicationJob): Promise<unknown>;
  /** Confirma el resultado durable para el status público de Queues. */
  markCompleted?(jobId: string, result: unknown): Promise<void>;
}

/** Procesa un batch de publicaciones. Ack por mensaje; fallo → retry(). */
export async function consumeNeedsBatch(
  batch: IncomingQueueBatch,
  deps: NeedsConsumerDeps,
): Promise<void> {
  for (const message of batch.messages) {
    const job = message.body as NeedPublicationJob;
    let result: unknown;
    try {
      result = await deps.publish(job);
    } catch (err) {
      console.error(
        `[queue:needs] mensaje ${message.id} falló (intento ${message.attempts ?? "?"}):`,
        err instanceof Error ? err.message : String(err),
      );
      message.retry();
      continue;
    }
    if (job.jobId && deps.markCompleted) {
      try {
        await deps.markCompleted(job.jobId, result);
      } catch (err) {
        // La publicación externa ya ocurrió: reintentar el mensaje podría
        // duplicarla. Dejamos el fallo observable sin repetir el side effect.
        console.error(
          `[queue:needs] se publicó ${job.jobId}, pero no se pudo guardar su estado:`,
          err instanceof Error ? err.message : String(err),
        );
      }
    }
    message.ack();
  }
}

/**
 * Job de importación de pacientes (misma forma que el camino BullMQ:
 * lib/queues.PatientImportJobData). Los campos pesados (fileBase64) nunca
 * viajan por Queues — el productor materializa las filas antes de encolar.
 */
export interface ImportJobBody {
  importId: string;
  mode: "process" | "apply" | "ocr";
  actorId?: string | null;
  imageUrl?: string;
}

export interface ImportsConsumerDeps {
  /** Ejecuta el job (inyectable para tests; en prod, patient-imports). */
  run(job: ImportJobBody): Promise<unknown>;
}

function isImportJob(body: unknown): body is ImportJobBody {
  const job = body as ImportJobBody | null;
  return (
    typeof job === "object" &&
    job !== null &&
    typeof job.importId === "string" &&
    typeof job.mode === "string"
  );
}

/** Procesa un batch de importaciones. Ack por mensaje; fallo → retry(). */
export async function consumeImportsBatch(
  batch: IncomingQueueBatch,
  deps: ImportsConsumerDeps,
): Promise<void> {
  for (const message of batch.messages) {
    if (!isImportJob(message.body)) {
      console.error(`[queue:imports] mensaje ${message.id} sin forma de job — al DLQ.`);
      message.retry();
      continue;
    }
    try {
      await deps.run(message.body);
      message.ack();
    } catch (err) {
      console.error(
        `[queue:imports] ${message.body.mode} de ${message.body.importId} falló (intento ${message.attempts ?? "?"}):`,
        err instanceof Error ? err.message : String(err),
      );
      message.retry();
    }
  }
}

/**
 * Job del matcher determinista (U8): `{ prn }` únicamente (regla de Queues de
 * mensajes ≤128KB — no hace falta más, `services/matcher` resuelve el registro
 * completo a partir del PRN). Mismo criterio que `ImportJobBody`: forma propia
 * aquí, desacoplada de `services/matcher` — el consumidor no importa el
 * módulo de dominio, solo la forma del mensaje.
 */
export interface MatcherJobBody {
  prn: string;
}

export interface MatcherConsumerDeps {
  /** Procesa un sweep del matcher para un PRN (inyectable para tests; en
   *  prod, services/matcher.processMatcherMessage). */
  run(job: MatcherJobBody): Promise<unknown>;
}

function isMatcherJob(body: unknown): body is MatcherJobBody {
  const job = body as MatcherJobBody | null;
  return typeof job === "object" && job !== null && typeof job.prn === "string" && job.prn.length > 0;
}

/**
 * Procesa un batch de sweeps del matcher. Ack por mensaje; fallo → retry()
 * (mismo criterio que `consumeNeedsBatch`/`consumeImportsBatch`: Queues
 * reintenta según `max_retries`/`retry_delay` del consumidor en
 * wrangler.jsonc y agotados los reintentos cae al DLQ genérico). Un mensaje
 * sin forma de job también hace retry() en vez de descartarse en silencio —
 * si nunca adquiere forma válida, agota reintentos igual y queda visible en
 * `audit_log` vía el DLQ, en vez de perderse sin rastro.
 *
 * Idempotente por construcción vía `services/matcher`: la escritura de
 * `person_links` es un upsert por `(prn_a, prn_b)` (KTD4/KTD5), así que la
 * entrega al-menos-una-vez de Queues es segura — dos entregas del MISMO
 * mensaje dejan la MISMA fila.
 */
export async function consumeMatcherBatch(
  batch: IncomingQueueBatch,
  deps: MatcherConsumerDeps,
): Promise<void> {
  for (const message of batch.messages) {
    if (!isMatcherJob(message.body)) {
      console.error(`[queue:matcher] mensaje ${message.id} sin forma de job — reintento.`);
      message.retry();
      continue;
    }
    try {
      await deps.run(message.body);
      message.ack();
    } catch (err) {
      console.error(
        `[queue:matcher] sweep de ${message.body.prn} falló (intento ${message.attempts ?? "?"}):`,
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

export interface DlqHooks {
  /** Marca terminalmente fallida una publicación de necesidades. */
  onNeedDeadLetter?(job: NeedPublicationJob): Promise<void>;
  /**
   * Carta muerta de un job de importación: espejo del "último intento" del
   * processor BullMQ — marca el lote como fallido para que el panel lo
   * muestre en vez de dejarlo "processing" para siempre. Best-effort.
   */
  onImportDeadLetter?(job: ImportJobBody): Promise<void>;
}

/** Procesa un batch del DLQ: persistir y SIEMPRE ack (nunca reencolar). */
export async function consumeDlqBatch(
  batch: IncomingQueueBatch,
  persist: PersistDeadLetter,
  hooks: DlqHooks = {},
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
    if (hooks.onImportDeadLetter && isImportJob(message.body)) {
      try {
        await hooks.onImportDeadLetter(message.body);
      } catch (err) {
        console.error(
          `[queue:dlq] no se pudo marcar fallido el lote ${(message.body as ImportJobBody).importId}:`,
          err instanceof Error ? err.message : String(err),
        );
      }
    }
    const needJob = message.body as NeedPublicationJob | null;
    if (hooks.onNeedDeadLetter && needJob?.jobId && needJob.need) {
      try {
        await hooks.onNeedDeadLetter(needJob);
      } catch (err) {
        console.error(
          `[queue:dlq] no se pudo marcar fallida la publicación ${needJob.jobId}:`,
          err instanceof Error ? err.message : String(err),
        );
      }
    }
    message.ack();
  }
}
