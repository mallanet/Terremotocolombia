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
 * TERCERA puerta por la que se cuelan los valores de la fila, y la que de verdad
 * mordio: Drizzle NO propaga el error del driver tal cual. Lo envuelve en un
 * `DrizzleQueryError` cuyo `message` es la sentencia SQL **mas los parametros
 * ligados**:
 *
 *   Failed query: insert into "volunteers" (...) values ($1, $2, ...)
 *   params: <uuid>,<nombre real>,<telefono real>,...,<ciudad>
 *
 * El SQL es informacion de esquema y es justo lo que se quiere ver; los params
 * son PII de una persona real. Se corta en el marcador.
 *
 * (Esto se detecto en produccion el 2026-08-11: la primera version de este
 * modulo blindaba `detail`/`where` de Postgres y aun asi filtro nombre, telefono
 * y ciudad de un voluntario, porque el error nunca llego con forma de error de
 * Postgres — llego envuelto por el ORM.)
 */
function withoutBoundParams(message: string): string {
  const cut = message.search(/\n?\s*params:/i);
  return cut === -1 ? message : `${message.slice(0, cut).trimEnd()} [params omitidos]`;
}

/**
 * Desenvuelve la cadena de `cause` hasta el error que SI trae SQLSTATE. Drizzle
 * pone el error del driver (NeonDbError, con `code`) en `cause`, asi que mirar
 * solo el error de arriba pierde justo el dato que diagnostica el fallo.
 */
function rootPgError(err: Error): PgLikeError {
  let cur: unknown = err;
  for (let i = 0; i < 5 && cur instanceof Error; i++) {
    if (str((cur as unknown as PgLikeError).code)) return cur as unknown as PgLikeError;
    cur = (cur as { cause?: unknown }).cause;
  }
  return err as unknown as PgLikeError;
}

/**
 * Proyeccion PII-safe de un error de base: solo campos que describen el
 * ESQUEMA, nunca los datos de la fila. Ver el allowlist del encabezado.
 */
export function describeDbError(err: unknown): string {
  if (!(err instanceof Error)) return `non-error thrown (${typeof err})`;
  // El SQLSTATE vive en el error del driver, que Drizzle deja en `cause`.
  const e = rootPgError(err);
  const message = str(e.message) ?? str(err.message);
  const parts = [
    str(e.name) ?? "Error",
    str(e.code) && `sqlstate=${str(e.code)}`,
    str(e.table) && `table=${str(e.table)}`,
    str(e.column) && `column=${str(e.column)}`,
    str(e.constraint) && `constraint=${str(e.constraint)}`,
    // `message` va el ULTIMO y es el unico campo en prosa que se admite, y aun
    // asi pasa por `withoutBoundParams`: describe el objeto del esquema, nunca
    // los valores. `detail`/`where`/`hint` quedan fuera a proposito.
    message && `msg=${withoutBoundParams(message)}`,
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
