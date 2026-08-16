/**
 * Enrutado de Cron Triggers.
 *
 * Vive aparte de `src/worker.ts` a propósito: ese módulo crea un servidor HTTP
 * e importa `cloudflare:node` en ámbito de módulo, así que no se puede importar
 * desde un test. Sacando aquí la decisión de "qué expresión ejecuta qué", la
 * parte con lógica queda cubierta por tests y `worker.ts` se queda solo con el
 * cableado.
 *
 * Las expresiones son la FUENTE DE VERDAD y `backend/wrangler.jsonc` debe
 * declarar exactamente estas mismas. `test/cron-jobs.test.ts` compara las dos
 * para que un cambio en el JSON no deje un cron huérfano que no ejecuta nada.
 */

/** Sync del catálogo de sismos (USGS). Ya en producción. */
export const CRON_EARTHQUAKES = "*/5 * * * *";

/**
 * Geocodificación de ubicaciones pendientes.
 *
 * Misma cadencia de 5 minutos que el sync de sismos pero DESFASADA dos minutos
 * (minutos 2, 7, 12, …). Dos motivos: `controller.cron` es la única forma de
 * distinguir un trigger de otro, así que dos expresiones idénticas serían
 * indistinguibles; y desfasarlas evita que las dos tareas compitan por el mismo
 * presupuesto de invocación.
 */
export const CRON_GEOCODE = "2-59/5 * * * *";

/**
 * Reconciliación de PRNs (U7, KTD8): estampa registros sin PRN (backfill en
 * sus primeras corridas; red de seguridad de la carrera del camino inline en
 * régimen permanente) y corre los invariantes de cluster de U9. Misma
 * cadencia de 5 minutos, DESFASADA dos minutos más que `CRON_GEOCODE` (y
 * cuatro que `CRON_EARTHQUAKES`) por el mismo motivo: `controller.cron` es lo
 * único que distingue un trigger de otro, así que las tres expresiones deben
 * ser distintas, y el desfase evita que compitan por el mismo presupuesto de
 * invocación.
 */
export const CRON_PERSON_RECONCILE = "4-59/5 * * * *";

/** Todas las expresiones que este Worker espera recibir. */
export const CRON_EXPRESSIONS = [
  CRON_EARTHQUAKES,
  CRON_GEOCODE,
  CRON_PERSON_RECONCILE,
] as const;

export type CronHandler = (now: number) => Promise<void>;

/**
 * Ejecuta el handler de una expresión cron.
 *
 * Una expresión desconocida NO lanza: se registra y se vuelve. Lanzar haría que
 * Cloudflare reintentara un trigger que nunca va a coincidir, y el fallo real
 * (config y código desincronizados) no se arregla reintentando.
 */
export async function dispatchCron(
  cron: string,
  now: number,
  handlers: Readonly<Record<string, CronHandler>>,
): Promise<void> {
  const handler = handlers[cron];
  if (!handler) {
    console.warn(
      `[cron] expresión no reconocida: "${cron}". ` +
        `Esperadas: ${CRON_EXPRESSIONS.join(", ")}. No se ejecutó nada.`,
    );
    return;
  }
  const startedAt = performance.now();
  let outcome: "ok" | "error" = "ok";
  try {
    await handler(now);
  } catch (error) {
    outcome = "error";
    throw error;
  } finally {
    console.log({
      t: "cron_run",
      cron,
      outcome,
      dur_ms: Math.round(performance.now() - startedAt),
    });
  }
}
