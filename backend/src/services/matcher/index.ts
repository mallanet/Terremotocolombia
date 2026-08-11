/**
 * Punto de entrada del matcher determinista (U8). Consume UN mensaje
 * `{ prn }`, resuelve el registro disparador vía el registro de PRNs
 * (`services/person-records.ts`), genera candidatos deterministas
 * (`./candidates.ts`) y propone/refresca cada par (`./propose.ts`).
 *
 * Se re-ejecuta COMPLETO en cada intento — no hay estado a mitad de camino
 * que limpiar. Es idempotente por construcción: `proposeLink` es un upsert
 * condicional por `(prn_a, prn_b)` (KTD4/KTD5), así que la entrega
 * al-menos-una-vez de Cloudflare Queues nunca deja más de una fila por par.
 *
 * Sin `try/catch` propio a propósito: un fallo (típicamente de DB) se
 * propaga para que `lib/queue-consumer.ts` haga `retry()` — mismo criterio
 * que `consumeImportsBatch`/`consumeNeedsBatch`.
 */
import { resolvePrn } from "@/services/person-records";
import { findCandidates } from "./candidates";
import { proposeLink } from "./propose";

export interface MatcherJobBody {
  prn: string;
}

export async function processMatcherMessage(job: MatcherJobBody): Promise<void> {
  const ref = await resolvePrn(job.prn);
  if (!ref) {
    // PRN bien formado pero sin registro (o forma inválida): no es un error
    // del matcher — se loguea y se descarta sin reintentar (reintentar no
    // hace que el PRN empiece a existir).
    console.warn(`[matcher] PRN no resuelve a ningún registro, se ignora: ${job.prn}`);
    return;
  }
  if (ref.removedAt !== null) return; // tombstone (U10): registro borrado, sin propuestas.

  const candidates = await findCandidates(job.prn, ref);
  for (const candidate of candidates) {
    await proposeLink({
      triggerPrn: job.prn,
      counterpartPrn: candidate.counterpartPrn,
      evidenceClass: candidate.evidenceClass,
    });
  }
}

export type { MatcherCandidate } from "./candidates";
export { findCandidates, normalizeName } from "./candidates";
export type { EvidenceClass, ProposeLinkInput, ProposeLinkResult } from "./propose";
export {
  buildEvidence,
  evidenceClassRank,
  isStrongerEvidenceClass,
  MATCHER_METHOD,
  MATCHER_VERSION,
  orderPair,
  proposeLink,
} from "./propose";
