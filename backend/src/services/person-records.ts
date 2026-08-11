/**
 * Registro de PRNs (`person_records`) — U7. El overlay de identidad NUNCA
 * modifica las tablas fuente (missing_persons, hospital_patients,
 * unidentified_persons): este service es el ÚNICO lugar que lee/escribe
 * `person_records`.
 *
 * Dos caminos escriben, y comparten la MISMA disciplina de inserción
 * (`INSERT ... ON CONFLICT (record_type, record_id) DO NOTHING RETURNING`,
 * vía `stampBatch`) para que no puedan divergir (KTD8):
 *   1. `ensurePrn` — best-effort, inline, tras el insert de cada camino de
 *      creación (missing.ts, patients.ts, ...). Nunca falla el write padre.
 *   2. `reconcilePersonRecords` — el cron de backfill/reconciliación. Sus
 *      primeras corridas SON el backfill de lo que ya existía; en régimen
 *      permanente es la red de seguridad para la carrera del camino inline
 *      (dos escrituras concurrentes al mismo record_id antes de que la
 *      primera termine de estampar).
 *
 * Sin `db.transaction()` a propósito (prohibido en `src/**`: el driver HTTP
 * de Neon en Workers no soporta transacciones interactivas). Cada escritura
 * es una máquina de estados idempotente: ON CONFLICT DO NOTHING + reintento
 * ante colisión de PK, nunca SELECT-then-INSERT con lock.
 */
import { eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { generatePrn, normalizePrn } from "@/lib/prn";

const { personRecords } = schema;

/** Máximo de reintentos ante colisión de PK (`person_records.prn`) — KTD7:
 *  astronómicamente improbable (8 símbolos de 32^8 combinaciones), pero el
 *  codec es puro y no puede garantizar unicidad por sí solo. */
const MAX_COLLISION_RETRIES = 3;

/**
 * Normaliza el resultado de `getDb().execute()` a un arreglo de filas — el
 * driver neon-http devuelve el arreglo directo; node-postgres devuelve
 * `{ rows }`. Mismo helper que `services/missing.ts` (no se importa de ahí:
 * es una función de una línea, y ese archivo no expone la suya).
 */
function execRows<T>(result: unknown): T[] {
  return (Array.isArray(result) ? result : (result as { rows: T[] }).rows) as T[];
}

/**
 * ¿El error es una violación de unicidad de Postgres (23505)? Drizzle envuelve
 * el error del driver en `DrizzleQueryError`, con el `code` real en `cause`
 * (a veces varios niveles adentro) — recorrer la cadena cubre ambas formas.
 * Mismo idioma que `public-api/resources/patients.resource.ts`.
 */
function isUniqueViolation(err: unknown): boolean {
  let current: unknown = err;
  for (let depth = 0; depth < 4 && typeof current === "object" && current !== null; depth++) {
    if ((current as { code?: string }).code === "23505") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

/**
 * Intenta insertar un lote de `(recordType, id)` con PRNs nuevos, vía UN
 * único INSERT multi-fila (`ON CONFLICT (record_type, record_id) DO NOTHING
 * RETURNING`). Es el ÚNICO camino de escritura a `person_records` — tanto
 * `ensurePrn` (lote de 1) como `reconcilePersonRecords` (lotes grandes) pasan
 * por aquí, así que no hay dos disciplinas de inserción que puedan divergir.
 *
 * Colisión de PK (`prn` ya existe — rarísimo): el INSERT multi-fila es
 * atómico, así que UNA sola colisión aborta el lote entero; se reintenta el
 * LOTE COMPLETO con PRNs nuevos para todas las filas, hasta
 * `MAX_COLLISION_RETRIES` veces. Cualquier otro error se propaga.
 *
 * Devuelve SOLO las filas que este llamador insertó de verdad (el RETURNING
 * set) — las que ya existían (perdieron la carrera de ON CONFLICT DO
 * NOTHING, o ya estaban estampadas de antes) no aparecen aquí. Quien necesite
 * el PRN de una fila ya existente usa `resolvePrn` o vuelve a leer.
 */
async function stampBatch(
  recordType: string,
  ids: readonly string[],
  now: number,
): Promise<Array<{ id: string; prn: string }>> {
  if (ids.length === 0) return [];
  const db = getDb();

  for (let attempt = 0; attempt < MAX_COLLISION_RETRIES; attempt++) {
    const tuples = ids.map((id) => sql`(${generatePrn()}, ${recordType}, ${id}, ${now})`);
    try {
      const out = await db.execute(sql`
        INSERT INTO person_records (prn, record_type, record_id, created_at)
        VALUES ${sql.join(tuples, sql`,`)}
        ON CONFLICT (record_type, record_id) DO NOTHING
        RETURNING prn, record_id AS id
      `);
      return execRows<{ id: string; prn: string }>(out);
    } catch (err) {
      if (isUniqueViolation(err)) continue; // colisión de PK -> reintenta con PRNs nuevos
      throw err;
    }
  }

  throw new Error(
    `person-records: colisión de PRN persistente tras ${MAX_COLLISION_RETRIES} intentos ` +
      `(record_type="${recordType}", ${ids.length} fila(s)).`,
  );
}

/**
 * Garantiza que `(recordType, recordId)` tenga un PRN, creándolo si hace
 * falta. Idempotente: llamarla dos veces para el mismo registro deja UNA
 * sola fila (la segunda llamada pierde el ON CONFLICT y simplemente lee la
 * que ya existe).
 *
 * BEST-EFFORT a propósito (KTD8): se llama DESPUÉS del insert del camino de
 * creación (missing.ts, patients.ts, ...) y NUNCA debe tumbar esa escritura
 * ya confirmada. Cualquier fallo se loguea y devuelve `null` — el registro
 * queda sin PRN hasta que `reconcilePersonRecords` lo recoja en su próxima
 * corrida.
 */
export async function ensurePrn(
  recordType: string,
  recordId: string,
): Promise<string | null> {
  try {
    await stampBatch(recordType, [recordId], Date.now());
    const db = getDb();
    const rows = execRows<{ prn: string }>(
      await db.execute(sql`
        SELECT prn FROM person_records
        WHERE record_type = ${recordType} AND record_id = ${recordId}
        LIMIT 1
      `),
    );
    return rows[0]?.prn ?? null;
  } catch (err) {
    console.error(
      `[person-records] ensurePrn best-effort falló para record_type="${recordType}" ` +
        `record_id="${recordId}":`,
      err,
    );
    return null;
  }
}

/** A qué registro fuente apunta un PRN, o `null` si el PRN no existe. */
export interface PersonRecordRef {
  recordType: string;
  recordId: string;
  /** Tombstone (U10): no-null cuando el registro fuente fue borrado. */
  removedAt: number | null;
}

/**
 * Resuelve un PRN a su registro fuente. Acepta cualquier forma tolerada por
 * `normalizePrn` (mayúsculas/minúsculas, alias I/L/O, guiones opcionales) —
 * quien busca por PRN no necesita transcribirlo exacto.
 */
export async function resolvePrn(prn: string): Promise<PersonRecordRef | null> {
  const canonical = normalizePrn(prn);
  if (!canonical) return null;

  const db = getDb();
  const rows = await db
    .select({
      recordType: personRecords.recordType,
      recordId: personRecords.recordId,
      removedAt: personRecords.removedAt,
    })
    .from(personRecords)
    .where(eq(personRecords.prn, canonical))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Las tres poblaciones fuente que este backfill/cron cubre (R8). Catálogo
 * cerrado e interno — nunca viene de una request, así que `sql.raw()` sobre
 * `table` en `listUnstamped` es seguro.
 */
interface Population {
  readonly recordType: string;
  readonly table: string;
}

const POPULATIONS: readonly Population[] = [
  { recordType: "missing_report", table: "missing_persons" },
  { recordType: "hospital_patient", table: "hospital_patients" },
  { recordType: "unidentified_person", table: "unidentified_persons" },
];

/**
 * Ids de `recordType` SIN PRN (LEFT JOIN contra `person_records`), en orden
 * de `id`, después de `cursor` — keyset, nunca "offset" (que repite o salta
 * filas si la tabla cambia entre páginas). Mismo idioma de paginación
 * acotada que `services/geocode-batch.ts`.
 *
 * `recordType` desconocido -> `[]` (no lanza; deja que el llamador decida qué
 * hacer con una población que no existe).
 */
export async function listUnstamped(
  recordType: string,
  cursor: string | null,
  limit: number,
): Promise<string[]> {
  const population = POPULATIONS.find((p) => p.recordType === recordType);
  if (!population) return [];

  const db = getDb();
  // Nombre de tabla interpolado con sql.raw: seguro porque `population.table`
  // sale del catálogo cerrado de arriba, jamás de una request.
  const table = sql.raw(`"${population.table}"`);
  const cursorClause = cursor ? sql`AND t.id > ${cursor}` : sql``;

  const rows = execRows<{ id: string }>(
    await db.execute(sql`
      SELECT t.id
      FROM ${table} t
      LEFT JOIN person_records pr
        ON pr.record_type = ${recordType} AND pr.record_id = t.id
      WHERE pr.prn IS NULL ${cursorClause}
      ORDER BY t.id
      LIMIT ${limit}
    `),
  );
  return rows.map((row) => row.id);
}

/**
 * TODO-U8: encolar un mensaje `{ prn }` por PRN vía el binding de Cloudflare
 * Queues que U8 declara (`terremotocolombia-matcher`), a través del seam de
 * `lib/job-dispatch.ts` como el resto de productores del repo.
 *
 * Por ahora es un no-op deliberado — SOLO registra la llamada para que el
 * test seam (`takeMatcherSweepCalls`, más abajo) pueda observarla, sin tocar
 * ningún transporte real. `reconcilePersonRecords` YA lo llama con el
 * RETURNING set exacto de cada lote (los PRNs recién estampados EN ESA
 * corrida, nunca los que otro writer ganó por la carrera del ON CONFLICT),
 * así que cuando U8 exista, conectar el binding real aquí dentro es el ÚNICO
 * cambio necesario — ningún call site cambia.
 */
let matcherSweepCalls: string[][] = [];

export function enqueueMatcherSweep(prns: string[]): void {
  matcherSweepCalls.push(prns);
}

/**
 * SOLO para tests: drena y devuelve las llamadas acumuladas a
 * `enqueueMatcherSweep`, en orden. Existe porque una llamada intra-módulo
 * (como la de `reconcilePersonRecords` de aquí abajo) no pasa por el binding
 * exportado, así que un `vi.spyOn` sobre este módulo no la vería — mismo
 * idioma que `resetJobBindings` en `lib/job-dispatch.ts`.
 */
export function takeMatcherSweepCalls(): string[][] {
  const calls = matcherSweepCalls;
  matcherSweepCalls = [];
  return calls;
}

/**
 * TODO-U9: KTD8 exige tres invariantes de cluster (coincidencia de extremos
 * de link confirmado, conectividad por cluster en cadencia lenta, estado sin
 * decisión revertido) que viven en `services/person-links.ts` /
 * `services/person-clusters.ts` — módulos que U9 construye. Este hook es el
 * punto de enganche: el cron ya lo llama en cada corrida; cuando U9 exista,
 * este cuerpo pasa a invocar las comprobaciones reales (con su propia lógica
 * de cadencia — cheap checks cada corrida, la caminata de conectividad en
 * una más lenta).
 */
export async function runClusterInvariantChecks(): Promise<void> {
  // no-op (TODO-U9): ver KTD8 en el plan.
}

/** Resultado de una corrida de `reconcilePersonRecords`. */
export interface ReconcileResult {
  /** PRNs nuevos estampados en esta corrida, por `record_type`. */
  stampedByType: Record<string, number>;
  /** Total de PRNs nuevos estampados en esta corrida (todas las poblaciones). */
  stampedTotal: number;
  /** true si esa población quedó sin backlog al terminar esta corrida (no
   *  implica que el backlog GLOBAL esté vacío — solo que esta corrida no dejó
   *  nada pendiente detrás del cursor con el que empezó). */
  drainedByType: Record<string, boolean>;
}

const DEFAULT_RECONCILE_BATCH_SIZE = 200;
const DEFAULT_RECONCILE_TIME_BUDGET_MS = 60_000;

/**
 * El cron de reconciliación (KTD8): para cada población, pagina por
 * `listUnstamped` detrás de un cursor de `id`, estampa cada lote con
 * `stampBatch` (misma disciplina que `ensurePrn`), y encola un matcher sweep
 * SOLO con lo que esta corrida insertó de verdad. Acotado por cantidad
 * (`batchSize`) y por tiempo (`timeBudgetMs`) — patrón calcado de
 * `services/geocode-batch.ts`: sus primeras corridas SON el backfill de lo
 * que ya existía; en régimen permanente es la red de seguridad de la carrera
 * del camino inline.
 *
 * Sin catch propio a propósito: un fallo se propaga (como `runGeocode`), para
 * que quien la invoque desde el handler `scheduled` decida logueo y
 * reintento — Cloudflare reintenta un cron cuyo handler lanza, y eso es lo
 * deseable aquí (la escritura es idempotente).
 */
export async function reconcilePersonRecords(
  opts: { timeBudgetMs?: number; batchSize?: number } = {},
): Promise<ReconcileResult> {
  const timeBudgetMs = Math.max(
    1,
    Math.trunc(opts.timeBudgetMs ?? DEFAULT_RECONCILE_TIME_BUDGET_MS),
  );
  const batchSize = Math.min(
    Math.max(Math.trunc(opts.batchSize ?? DEFAULT_RECONCILE_BATCH_SIZE), 1),
    1000,
  );
  const startedAt = Date.now();

  const result: ReconcileResult = { stampedByType: {}, stampedTotal: 0, drainedByType: {} };

  for (const population of POPULATIONS) {
    result.stampedByType[population.recordType] = 0;
    result.drainedByType[population.recordType] = false;
    let cursor: string | null = null;

    while (Date.now() - startedAt < timeBudgetMs) {
      const ids = await listUnstamped(population.recordType, cursor, batchSize);
      if (ids.length === 0) {
        result.drainedByType[population.recordType] = true;
        break;
      }

      const stamped = await stampBatch(population.recordType, ids, startedAt);
      result.stampedByType[population.recordType] =
        (result.stampedByType[population.recordType] ?? 0) + stamped.length;
      result.stampedTotal += stamped.length;
      if (stamped.length > 0) {
        enqueueMatcherSweep(stamped.map((row) => row.prn));
      }

      // Avanza sobre TODO el lote leído, no solo sobre lo insertado por esta
      // corrida: una fila que otro writer ya estampó (ON CONFLICT DO NOTHING
      // la deja fuera de `stamped`) sigue estando estampada — releerla en la
      // próxima página sería trabajo perdido, no progreso.
      cursor = ids[ids.length - 1] ?? cursor;

      if (ids.length < batchSize) {
        result.drainedByType[population.recordType] = true;
        break;
      }
    }
  }

  await runClusterInvariantChecks();

  return result;
}
