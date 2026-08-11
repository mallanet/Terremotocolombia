/**
 * Allowlist de dominios de media por socio de `partner-sync` (U13).
 *
 * Por qué esto existe: `GET /api/missing/:id/photo` hace 302 a la URL guardada
 * en `photo_external_url` SIN validar su dominio (ver services/missing.ts,
 * `getMissingPhoto` → rama `{ redirectTo: stored }`). Cualquier `photoUrl` que
 * un socio mande en el batch de partner-sync termina como destino de ese
 * redirect público — sin este allowlist, un socio (o alguien con su llave)
 * podría convertir el endpoint de foto en un open redirect hacia cualquier
 * host. Lo mismo aplica a `sourceUrl` (se guarda y se puede mostrar como
 * enlace saliente).
 *
 * Diseño DELIBERADAMENTE de código, no de DB/admin UI:
 *  - Alta de socio nuevo o dominio nuevo = cambio de código revisado (PR),
 *    igual que cualquier otro límite de seguridad del repo — no una fila que
 *    alguien con `missing:create` pudiera tocar indirectamente.
 *  - Socio DESCONOCIDO o con lista VACÍA => sus URLs de media se anulan
 *    (`null`), el registro se acepta igual. Nunca se rechaza el batch
 *    completo por una foto de dominio no permitido: se cae la foto, no la
 *    persona.
 *
 * La clave del mapa es el `source` que estampa el router
 * (`partner:<email-de-la-sesión>`, siempre en minúsculas — ver
 * partnerSource() en partner-sync.router.ts).
 *
 * Match de hostname: EXACTO, o subdominio limpio de una entrada de la lista
 * (`foto.aliado.org` matchea la entrada `aliado.org`). NUNCA substring/includes
 * — eso dejaría pasar hosts como `aliado.org.evil.net` o `noaliado.org`.
 */

/**
 * Registro fuente de verdad. Vacío a propósito: hoy no hay socio vetted en
 * producción para partner-sync (fase de prueba, ver header del router). Añadir
 * un socio real es una línea aquí, en PR, con el hostname exacto que el socio
 * confirmó.
 *
 * Ejemplo (comentado, no activo):
 *   "partner:integraciones@ejemplo-aliado.org": ["cdn.ejemplo-aliado.org"],
 */
export const PARTNER_MEDIA_ALLOWLIST: Record<string, readonly string[]> = {};

/** Hostname en minúsculas de una URL http(s), o null si no parsea / no es http(s). */
function httpHostname(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  return parsed.hostname.toLowerCase();
}

/** True si `hostname` es EXACTAMENTE una entrada permitida, o subdominio limpio de una. */
function hostnameAllowed(hostname: string, allowed: readonly string[]): boolean {
  return allowed.some((entryRaw) => {
    const entry = entryRaw.trim().toLowerCase();
    if (!entry) return false;
    return hostname === entry || hostname.endsWith(`.${entry}`);
  });
}

/**
 * Valida una URL de media declarada por un socio contra SU allowlist.
 * Devuelve la URL sin tocar si el hostname está permitido; `null` en
 * cualquier otro caso (socio sin entrada, lista vacía, URL inválida, dominio
 * no permitido) — nunca lanza. El caller (partner-sync.router) usa el
 * resultado para anular el campo, no para rechazar el registro.
 */
export function allowedPartnerMediaUrl(
  source: string,
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  const allowed = PARTNER_MEDIA_ALLOWLIST[source];
  if (!allowed || allowed.length === 0) return null;
  const hostname = httpHostname(url);
  if (!hostname) return null;
  return hostnameAllowed(hostname, allowed) ? url : null;
}
