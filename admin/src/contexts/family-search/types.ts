/**
 * DTOs espejo de `backend/src/services/person-links.ts` +
 * `backend/src/services/person-clusters.ts` — leídos línea a línea contra
 * `backend/src/public-api/routers/person-links.router.ts` (U11 read-first).
 * NO se importan del backend (paquetes separados, sin tipos compartidos en
 * este repo — mismo criterio que `ImportRow` en patient-imports).
 */

export type LinkDecisionValue = "confirmar" | "rechazar" | "inseguro";
export type LinkStatus = "proposed" | "confirmed" | "rejected" | "unsure";

export interface PersonLinkDTO {
  id: string;
  prnA: string;
  prnB: string;
  status: LinkStatus | string;
  score: number | null;
  /** Tokens de campo SOLO "exact" en fase 1 (buildEvidence en
   *  matcher/propose.ts); "conflict"/"fuzzy" no existen todavía en el backend
   *  — el render los soporta de forma defensiva para cuando fase 2 los emita. */
  evidence: Record<string, string> | null;
  evidenceClass: string;
  method: string;
  matcherVersion: string | null;
  proposedAt: number;
}

/** Ficha de presentación de UN registro fuente — sin PII cruda más allá de
 *  nombre/edad (allowlist del backend, ver `RecordDisplay` en
 *  person-clusters.ts). NO trae foto: el contrato de este router no expone
 *  ningún campo de imagen hoy (ver informe de U11 — deviation documentada). */
export interface RecordDisplayDTO {
  prn: string;
  recordType: string;
  name: string;
  age: number | null;
  population: string;
  source: string;
  outcome: "registro eliminado" | null;
  clusterId: string | null;
}

export interface DecisionHistoryEntryDTO {
  id: string;
  linkId: string;
  prnA: string;
  prnB: string;
  decision: string;
  note: string;
  evidenceSnapshot: unknown;
  decidedBy: string;
  decidedAt: number;
}

export interface QueueItemDTO {
  link: PersonLinkDTO;
  a: RecordDisplayDTO | null;
  b: RecordDisplayDTO | null;
  priorRejection: DecisionHistoryEntryDTO | null;
}

export interface QueueResponse {
  items: QueueItemDTO[];
}

export interface DecisionResponse {
  item: PersonLinkDTO;
  idempotentReplay: boolean;
}

export interface ProposeResponse {
  item: PersonLinkDTO;
  created: boolean;
}

export interface UnmergeResponse {
  item: PersonLinkDTO;
}

export interface RecordSearchResponse {
  exactPrnMatch: RecordDisplayDTO | null;
  results: RecordDisplayDTO[];
}

export interface ClusterMemberFichaDTO extends RecordDisplayDTO {
  addedAt: number;
  /** null = miembro vivo; no-null = histórico (nunca se borra). */
  removedAt: number | null;
  addedBy: string;
}

export interface ClusterFichaDTO {
  clusterId: string;
  status: string;
  createdAt: number;
  members: ClusterMemberFichaDTO[];
  decisions: DecisionHistoryEntryDTO[];
}

export interface ClusterFichaResponse {
  item: ClusterFichaDTO;
}

/** Población → etiqueta ES (mismo vocabulario que `RecordDisplay.population`
 *  en person-clusters.ts: coincide 1:1 con `recordType`). */
export const POPULATION_LABELS: Record<string, string> = {
  missing_report: "Reporte de desaparición",
  hospital_patient: "Paciente hospitalario",
  unidentified_person: "Persona no identificada",
};

export function populationLabel(population: string): string {
  return POPULATION_LABELS[population] ?? population;
}

export const EVIDENCE_CLASS_LABELS: Record<string, string> = {
  document_hash_exact: "Documento (huella exacta)",
  name_age_exact: "Nombre + edad (exacto)",
  manual: "Propuesta manual",
};

export function evidenceClassLabel(evidenceClass: string): string {
  return EVIDENCE_CLASS_LABELS[evidenceClass] ?? evidenceClass;
}

/**
 * A dónde puede apuntar la ficha (vista lateral). `cluster`: el caso normal,
 * se lee vía GET .../clusters/:id. `standalone`: PRN resuelto pero SIN
 * cluster vivo todavía — `recomputeClusterFor` solo crea un cluster tras el
 * PRIMER link confirmado (ver person-clusters.ts); un registro aislado que
 * nunca pasó por una confirmación no tiene cluster que leer. El backend no
 * expone una ficha de "un solo registro", así que U11 la arma en el cliente
 * con el `RecordDisplayDTO` que ya trajo la búsqueda — ver informe de U11.
 */
export type FichaTarget =
  | { type: "cluster"; clusterId: string }
  | { type: "standalone"; record: RecordDisplayDTO };

/** Extrae, con guardas de tipo (evidenceSnapshot es `unknown` a propósito en
 *  el backend — ver DecisionHistoryEntryDTO), la evidenceClass congelada en
 *  el snapshot de una decisión previa — usada por el banner de re-propuesta. */
export function evidenceClassFromSnapshot(snapshot: unknown): string | null {
  if (snapshot && typeof snapshot === "object" && "evidenceClass" in snapshot) {
    const v = (snapshot as { evidenceClass?: unknown }).evidenceClass;
    return typeof v === "string" ? v : null;
  }
  return null;
}
