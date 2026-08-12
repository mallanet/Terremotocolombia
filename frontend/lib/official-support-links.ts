/**
 * Accesos rápidos a fuentes oficiales para /apoyo-disponible.
 *
 * Teléfonos: estructura 1XY (Resolución CRC 4972/2016), misma fuente que
 * `emergency-contacts.ts`. Enlaces web: portales .gov.co / instituciones
 * ya referenciadas en el sitio (SGC, UNGRD, Cruz Roja).
 */

export type OfficialPhoneLink = {
  id: string;
  label: string;
  hint: string;
  phone: string;
};

export type OfficialWebLink = {
  id: string;
  label: string;
  hint: string;
  href: string;
};

export type OfficialInternalLink = {
  id: string;
  label: string;
  hint: string;
  href: string;
};

/** Normaliza un número de display a `tel:` (dígitos, *, +, #). */
export function telHref(display: string): string {
  return `tel:${display.replace(/[^\d*+]/g, "")}`;
}

/** Líneas cortas para llamar ya (prioridad visual). */
export const OFFICIAL_QUICK_PHONES: OfficialPhoneLink[] = [
  {
    id: "emergencias-123",
    label: "123",
    hint: "Emergencias (única nacional)",
    phone: "123",
  },
  {
    id: "desastres-111",
    label: "111",
    hint: "Atención de desastres",
    phone: "111",
  },
  {
    id: "psicosocial-106",
    label: "106",
    hint: "Ayuda e intervención en crisis",
    phone: "106",
  },
  {
    id: "cruz-roja-132",
    label: "132",
    hint: "Cruz Roja Colombiana",
    phone: "132",
  },
  {
    id: "defensa-civil-144",
    label: "144",
    hint: "Defensa Civil",
    phone: "144",
  },
  {
    id: "bomberos-119",
    label: "119",
    hint: "Bomberos",
    phone: "119",
  },
];

/** Portales oficiales (abrir en pestaña nueva). */
export const OFFICIAL_QUICK_WEBS: OfficialWebLink[] = [
  {
    id: "sgc",
    label: "Servicio Geológico Colombiano",
    hint: "Reportes sísmicos oficiales",
    href: "https://www.sgc.gov.co/",
  },
  {
    id: "ungrd",
    label: "UNGRD · Gestión del riesgo",
    hint: "Portal nacional de desastres",
    href: "https://portal.gestiondelriesgo.gov.co/",
  },
  {
    id: "cruz-roja",
    label: "Cruz Roja Colombiana",
    hint: "Respuesta humanitaria",
    href: "https://www.cruzrojacolombiana.org/",
  },
];

/** Atajos internos del sitio. */
export const OFFICIAL_QUICK_INTERNAL: OfficialInternalLink[] = [
  {
    id: "telefonos",
    label: "Directorio completo",
    hint: "Todos los teléfonos 1XY",
    href: "/telefonos",
  },
  {
    id: "mapa-rescate",
    label: "Mapa de rescate",
    hint: "Áreas oficiales y afectación",
    href: "/mapa-de-rescate",
  },
];
