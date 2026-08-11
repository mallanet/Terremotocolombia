/**
 * ============================================================================
 * Log DIAGNOSTICABLE de un fallo de base, sin filtrar datos personales.
 * ============================================================================
 *
 * POR QUE EXISTE: los routes publicos envuelven sus escrituras en
 * `try { ... } catch { throw serviceUnavailable(...) }`. El `catch` sin binding
 * es deliberado para no filtrar detalles al cliente, pero tambien TIRA el error
 * a la basura: en los logs del Worker solo queda `POST /api/volunteers` y un
 * 503 pelado, sin una sola pista de por que.
 *
 * Eso costo una hora el 2026-08-11. La migracion 0003 (`phone` -> `contact` +
 * columnas del formulario ramificado) se commiteo junto al codigo pero NUNCA se
 * aplico —CI no corre migraciones, van gateadas por un humano—, asi que TODOS
 * los registros de voluntarios fallaban con un `42703 undefined_column`
 * determinista. En los logs era indistinguible de un parpadeo de red, y la
 * primera hipotesis fue justamente esa (flakiness de Neon, culpando a la
 * politica de reintentos de db/retry.ts). El SQLSTATE lo habria resuelto de un
 * vistazo.
 *
 * PRIVACIDAD (esto es lo delicado): el error de Postgres reparte la informacion
 * en campos con perfiles MUY distintos, y aqui la base guarda personas reales.
 *
 *  - `message` nombra el objeto del esquema, no los datos:
 *      'column "contact" of relation "volunteers" does not exist'
 *      'duplicate key value violates unique constraint "volunteers_pkey"'
 *    -> se registra.
 *  - `detail` / `where` / `hint` ECHAN LOS VALORES DE LA FILA:
 *      'Key (contact)=(+57 300 000 0000) already exists.'
 *      'Failing row contains (uuid, Maria ..., +57 ..., ...)'
 *    -> NUNCA se registran. Serian nombres y telefonos de voluntarios reales
 *       dentro de la retencion de logs de Cloudflare.
 *
 * Por eso NO vale `console.error(err)` a secas: serializa el objeto entero,
 * `detail` incluido. El allowlist de abajo es el punto entero de este modulo.
 */

/** Campos estructurados que expone un error de Postgres (node-postgres y NeonDbError). */
interface PgLikeError {
  name?: unknown;
  code?: unknown;
  constraint?: unknown;
  table?: unknown;
  column?: unknown;
  message?: unknown;
}

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.length > 0 ? v : undefined;

/**
 * Proyeccion PII-safe de un error de base: solo campos que describen el
 * ESQUEMA, nunca los datos de la fila. Ver el allowlist del encabezado.
 */
export function describeDbError(err: unknown): string {
  if (!(err instanceof Error)) return `non-error thrown (${typeof err})`;
  const e = err as unknown as PgLikeError;
  const parts = [
    str(e.name) ?? "Error",
    str(e.code) && `sqlstate=${str(e.code)}`,
    str(e.table) && `table=${str(e.table)}`,
    str(e.column) && `column=${str(e.column)}`,
    str(e.constraint) && `constraint=${str(e.constraint)}`,
    // `message` va el ULTIMO y es el unico campo en prosa que se admite:
    // describe el objeto del esquema, no los valores. `detail`/`where`/`hint`
    // quedan fuera a proposito.
    str(e.message) && `msg=${str(e.message)}`,
  ];
  return parts.filter(Boolean).join(" ");
}

/**
 * Registra un fallo de base con contexto de ruta. `context` identifica el sitio
 * ("volunteers.create"), no la peticion — nada de body, ids ni IP.
 */
export function logDbFailure(context: string, err: unknown): void {
  console.error(`[db-failure] ${context}: ${describeDbError(err)}`);
}

/**
 * Variante para fallos SALIENTES (fetch a un upstream, encolado en Queues). No
 * son errores de Postgres, asi que no tienen SQLSTATE ni `detail`; la proyeccion
 * se queda en name + message.
 *
 * Ojo con el mismo riesgo por otra puerta: el `message` de un fallo de fetch
 * puede arrastrar la URL, y una URL puede llevar un token en la query. Por eso
 * se recorta cualquier cosa que parezca query string antes de loguear.
 */
export function logUpstreamFailure(context: string, err: unknown): void {
  if (!(err instanceof Error)) {
    console.error(`[upstream-failure] ${context}: non-error thrown (${typeof err})`);
    return;
  }
  const safe = err.message.replace(/\?[^\s]*/g, "?<redacted>");
  console.error(`[upstream-failure] ${context}: ${err.name} ${safe}`);
}
