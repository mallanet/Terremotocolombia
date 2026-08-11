/**
 * Generación de candidatos deterministas (U8, KTD10) para UN registro
 * disparador (el PRN del mensaje). Dos señales, sin fuzzy y sin tolerancia de
 * edad — fase 1 es 100% determinista:
 *
 *   (a) `document_hash` exacto — cruce entre `hospital_patients` y
 *       `missing_persons`, en ambas direcciones, MÁS `missing_persons` contra
 *       sí misma (documentHash NO es único ahí — dos reportes con la misma
 *       cédula son evidencia de duplicado, no un conflicto). No hay
 *       `patient↔patient`: `hospital_patients.document_hash` es único
 *       globalmente (`idx_hospital_patients_document_hash_unique`), así que
 *       esa combinación es estructuralmente imposible.
 *   (b) nombre normalizado + edad exactos — `missing↔patient` y
 *       `missing↔missing`. `unidentified_persons` no tiene columna de edad
 *       ni de documento, así que fase 1 NO la cruza aquí — solo queda
 *       alcanzable por link manual (U9), tal como restated en el plan U8.
 *
 * `unidentified_person` como DISPARADOR tampoco genera candidatos (mismo
 * motivo: sin edad/documento no hay con qué comparar) — `findCandidates`
 * devuelve `[]` para ese `recordType`, sin lanzar.
 */
import { and, eq, ne, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { ensurePrn, type PersonRecordRef } from "@/services/person-records";
import type { EvidenceClass } from "./propose";

const { missingPersons, hospitalPatients } = schema;

function execRows<T>(result: unknown): T[] {
  return (Array.isArray(result) ? result : (result as { rows: T[] }).rows) as T[];
}

export interface MatcherCandidate {
  /** PRN de la contraparte (nunca el del disparador — ver exclusión de auto-par). */
  counterpartPrn: string;
  evidenceClass: EvidenceClass;
}

/**
 * Normalización de nombre por KTD10: minúsculas + sin acentos (NFD, se
 * eliminan las marcas combinantes) + espacios colapsados a uno solo, sin
 * espacios al borde. Pura — sin DB. Es la MISMA transformación que, del lado
 * de Postgres, aplica `lower(f_unaccent(regexp_replace(trim(name), '\s+', '
 * ', 'g')))` cuando la extensión está disponible (ver `unaccentReady`).
 */
export function normalizeName(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

let _unaccentReady: Promise<boolean> | null = null;
/**
 * ¿Está disponible `f_unaccent` (la función IMMUTABLE que envuelve la
 * extensión `unaccent`)? Mismo idioma exacto que `services/pets.ts` — se
 * detecta una vez, cacheado, vía `to_regprocedure` (no lanza si no existe).
 * `f_unaccent` NO se crea en ninguna migración de este repo todavía (se
 * instala fuera de banda, como el índice de `services/missing.ts`), así que
 * en un Postgres local recién levantado esto casi siempre resuelve `false` —
 * de ahí que el camino sin acentos de abajo esté cubierto por tests, no sea
 * solo teórico.
 */
function unaccentReady(): Promise<boolean> {
  if (!_unaccentReady) {
    _unaccentReady = (async () => {
      try {
        const db = getDb();
        const res = await db.execute(
          sql`SELECT to_regprocedure('public.f_unaccent(text)') AS oid`,
        );
        const rows = execRows<{ oid: string | null }>(res);
        return Boolean(rows[0]?.oid);
      } catch {
        return false;
      }
    })();
  }
  return _unaccentReady;
}

interface TriggerRow {
  recordId: string;
  name: string;
  age: number | null;
  documentHash: string | null;
}

/** Trae la fila fuente del disparador. `unidentified_person` no participa
 *  (sin edad/documento) → `null`, y el llamador lo trata como "sin candidatos". */
async function loadTriggerRow(ref: PersonRecordRef): Promise<TriggerRow | null> {
  const db = getDb();

  if (ref.recordType === "missing_report") {
    const rows = await db
      .select({
        id: missingPersons.id,
        name: missingPersons.name,
        age: missingPersons.age,
        documentHash: missingPersons.documentHash,
      })
      .from(missingPersons)
      .where(eq(missingPersons.id, ref.recordId))
      .limit(1);
    const row = rows[0];
    return row ? { recordId: row.id, name: row.name, age: row.age, documentHash: row.documentHash } : null;
  }

  if (ref.recordType === "hospital_patient") {
    const rows = await db
      .select({
        id: hospitalPatients.id,
        name: hospitalPatients.name,
        age: hospitalPatients.age,
        documentHash: hospitalPatients.documentHash,
      })
      .from(hospitalPatients)
      .where(eq(hospitalPatients.id, ref.recordId))
      .limit(1);
    const row = rows[0];
    return row ? { recordId: row.id, name: row.name, age: row.age, documentHash: row.documentHash } : null;
  }

  return null;
}

interface RawHit {
  recordType: "missing_report" | "hospital_patient";
  recordId: string;
}

/** (a) document_hash exacto — ver cabecera del módulo para qué direcciones cubre. */
async function documentHashHits(ref: PersonRecordRef, trigger: TriggerRow): Promise<RawHit[]> {
  if (!trigger.documentHash) return [];
  const db = getDb();
  const hits: RawHit[] = [];

  // hospital_patients: único globalmente cuando no-null, así que esto trae
  // 0 o 1 fila — y ninguna cuando el disparador YA es ese mismo paciente
  // (excluido por ne()).
  const patientRows = await db
    .select({ id: hospitalPatients.id })
    .from(hospitalPatients)
    .where(and(eq(hospitalPatients.documentHash, trigger.documentHash), ne(hospitalPatients.id, ref.recordId)));
  for (const row of patientRows) hits.push({ recordType: "hospital_patient", recordId: row.id });

  // missing_persons: NO único — misma cédula en dos reportes es la señal de
  // duplicado que este camino existe para encontrar.
  const missingRows = await db
    .select({ id: missingPersons.id })
    .from(missingPersons)
    .where(and(eq(missingPersons.documentHash, trigger.documentHash), ne(missingPersons.id, ref.recordId)));
  for (const row of missingRows) hits.push({ recordType: "missing_report", recordId: row.id });

  return hits;
}

/**
 * Busca en una tabla filas con `age` igual y nombre normalizado igual.
 *
 * Con `f_unaccent` disponible: el filtro completo (edad + nombre normalizado)
 * se evalúa en SQL — acotado y preciso.
 *
 * SIN `f_unaccent` (fallback, KTD10): en vez de filtrar por nombre en SQL con
 * una comparación que NO podría plegar acentos (perdería silenciosamente
 * pares como "José"/"Jose"), el filtro SQL se acota SOLO por `age` — que la
 * regla de negocio ya exige igual y no-nulo en ambos lados, así que no es un
 * scan sin criterio — y la comparación de nombre completa (acentos +
 * mayúsculas + espacios) se hace en TS sobre ese conjunto ya angosto. El
 * costo es escanear más filas por edad que un filtro por nombre habría
 * dejado pasar; la ganancia es CERO falsos negativos por acentuación aunque
 * el entorno no tenga la extensión — aceptable a los volúmenes de fase 1
 * (KTD10: "bounded scans are acceptable at current volumes"), y sin esto la
 * dedup de nombre simplemente no funcionaría en ningún Postgres que no tenga
 * `f_unaccent` instalado a mano (todo entorno local/CI de hoy).
 */
async function nameAgeHitsInTable(
  tableName: "missing_persons" | "hospital_patients",
  age: number,
  normalizedTriggerName: string,
  useAccent: boolean,
  excludeId: string | null,
): Promise<Array<{ id: string; name: string }>> {
  const db = getDb();
  // Nombre de tabla de un catálogo cerrado de dos valores (nunca de una
  // request) — mismo idioma seguro que `listUnstamped` en person-records.ts.
  const table = sql.raw(`"${tableName}"`);
  const excludeClause = excludeId ? sql`AND t.id <> ${excludeId}` : sql``;

  if (useAccent) {
    const nameExpr = sql`lower(f_unaccent(regexp_replace(trim(t.name), '\\s+', ' ', 'g')))`;
    return execRows<{ id: string; name: string }>(
      await db.execute(sql`
        SELECT t.id, t.name FROM ${table} t
        WHERE t.age = ${age} AND ${nameExpr} = ${normalizedTriggerName} ${excludeClause}
      `),
    );
  }

  const rows = execRows<{ id: string; name: string }>(
    await db.execute(sql`
      SELECT t.id, t.name FROM ${table} t
      WHERE t.age = ${age} ${excludeClause}
    `),
  );
  // Re-verificación en TS con la normalización COMPLETA (ver comentario de
  // arriba): el filtro SQL de este camino solo acotó por edad, así que la
  // comparación real de nombre pasa aquí, sobre el nombre YA normalizado.
  return rows.filter((row) => normalizeName(row.name) === normalizedTriggerName);
}

/** (b) nombre normalizado + edad exactos — ver cabecera del módulo para qué
 *  pairings cubre (`missing↔patient`, `missing↔missing`; nunca `patient↔patient`). */
async function nameAgeHits(ref: PersonRecordRef, trigger: TriggerRow): Promise<RawHit[]> {
  if (trigger.age === null) return []; // regla: edad igual Y no-nula en ambos lados.
  const normalizedTriggerName = normalizeName(trigger.name);
  if (!normalizedTriggerName) return [];

  const useAccent = await unaccentReady();
  const hits: RawHit[] = [];

  const targets: Array<{ recordType: RawHit["recordType"]; table: "missing_persons" | "hospital_patients" }> = [
    { recordType: "missing_report", table: "missing_persons" },
  ];
  if (ref.recordType === "missing_report") {
    targets.push({ recordType: "hospital_patient", table: "hospital_patients" });
  }

  for (const target of targets) {
    const excludeId = ref.recordType === target.recordType ? ref.recordId : null;
    const rows = await nameAgeHitsInTable(
      target.table,
      trigger.age,
      normalizedTriggerName,
      useAccent,
      excludeId,
    );
    for (const row of rows) hits.push({ recordType: target.recordType, recordId: row.id });
  }

  return hits;
}

/**
 * Candidatos deterministas para el registro que resuelve `ref` (disparado por
 * `triggerPrn`). Combina (a) y (b), deduplicando por `(recordType,
 * recordId)` — si UN candidato aparece por las dos señales en la misma
 * corrida, se queda con la clase más fuerte (`document_hash_exact`), nunca se
 * degrada. Cada contraparte se resuelve a su PRN vía `ensurePrn` (idempotente,
 * best-effort: si no logra estampar uno, ese candidato se omite esta corrida
 * — el cron de reconciliación lo estampará y un futuro sweep lo recogerá).
 */
export async function findCandidates(
  triggerPrn: string,
  ref: PersonRecordRef,
): Promise<MatcherCandidate[]> {
  const trigger = await loadTriggerRow(ref);
  if (!trigger) return [];

  const [hashHits, ageHits] = await Promise.all([
    documentHashHits(ref, trigger),
    nameAgeHits(ref, trigger),
  ]);

  const byKey = new Map<string, RawHit & { evidenceClass: EvidenceClass }>();
  for (const hit of hashHits) {
    byKey.set(`${hit.recordType}:${hit.recordId}`, { ...hit, evidenceClass: "document_hash_exact" });
  }
  for (const hit of ageHits) {
    const key = `${hit.recordType}:${hit.recordId}`;
    if (!byKey.has(key)) byKey.set(key, { ...hit, evidenceClass: "name_age_exact" });
    // si ya estaba por document_hash_exact, esa es la clase más fuerte — se queda.
  }

  const candidates: MatcherCandidate[] = [];
  for (const hit of byKey.values()) {
    const counterpartPrn = await ensurePrn(hit.recordType, hit.recordId);
    if (!counterpartPrn) continue; // best-effort: ver comentario de la función.
    if (counterpartPrn === triggerPrn) continue; // defensivo: nunca auto-par.
    candidates.push({ counterpartPrn, evidenceClass: hit.evidenceClass });
  }
  return candidates;
}
