import { deploymentConfig } from "@/lib/deployment-config";

/** Dominio público del sitio (config/deployment.config.json → domains.web). */
export const SITE_URL = `https://${deploymentConfig.domains.web}`;
export const SITE_NAME = `${deploymentConfig.productName} · ${deploymentConfig.orgName}`;
/** Schema.org / PWA mark — Mallanet isotipo on ink (never Epicentro). */
export const SITE_LOGO = "/icon-512.png";
/**
 * Surface-relative brand file names:
 * - `*-oscuro` = mark for light chrome surfaces
 * - `*-claro` = mark for dark chrome surfaces
 * Do not invert or filter these official SVGs.
 */
/** Nav / light chrome — official Mallanet isotipo for light surfaces. */
export const SITE_NAV_LOGO = "/brand/isotipo-oscuro.svg";
/** Nav dark chrome / footer — official Mallanet isotipo for dark surfaces. */
export const SITE_NAV_LOGO_ON_DARK = "/brand/isotipo-claro.svg";
/** Dark chrome / OG wordmark. */
export const SITE_WORDMARK_ON_DARK = "/brand/logo-claro.svg";
export const SITE_BRAND_NAME = deploymentConfig.orgName;
export const SITE_PRODUCT_NAME = deploymentConfig.productName;

/** Pure isotipo selector for chrome surfaces (nav dual-bind + footer always-dark). */
export function brandIsotipoSrc(surface: "light" | "dark"): string {
  return surface === "dark" ? SITE_NAV_LOGO_ON_DARK : SITE_NAV_LOGO;
}

export const CONTACT_EMAIL = deploymentConfig.contactEmail;

/** Comunidad WhatsApp de Mallanet (voluntariado / coordinación). */
export const COMMUNITY_WHATSAPP_URL = deploymentConfig.communityWhatsappUrl;

/** Copy del CTA de comunidad en el footer (sin Discord). */
export const COMMUNITY_CTA_LABEL =
  "¿Quieres ser voluntario? Únete a nuestra comunidad de WhatsApp";

/**
 * Pasarela de pago externa para donar dinero. Vacía cuando el despliegue no
 * declara `donationUrl`: entonces el botón sigue llevando a /donaciones, la
 * página que lista las formas de ayudar.
 */
export const DONATION_URL = deploymentConfig.donationUrl ?? "";

/** Sin el TLD: "Donar a Mallanet" cabe en la barra, "Donar a Mallanet.org" no. */
const DONATION_ORG = SITE_BRAND_NAME.replace(/\.[a-z]+$/i, "");

export const DONATION_CTA_LABEL = DONATION_URL
  ? `Donar a ${DONATION_ORG}`
  : "Donar";

/**
 * Aporte recurrente. Es un enlace de pago distinto, no el mismo con un
 * parámetro: en Stripe, único y suscripción son productos separados.
 */
export const DONATION_MONTHLY_URL = deploymentConfig.donationMonthlyUrl ?? "";

/** Destino ya resuelto del botón de donar, para no repetir el ternario en cada barra. */
export const DONATE_LINK = {
  href: DONATION_URL || "/donaciones",
  label: DONATION_CTA_LABEL,
  target: DONATION_URL ? "_blank" : undefined,
  rel: DONATION_URL ? "noopener noreferrer" : undefined,
  aria: DONATION_URL
    ? `${DONATION_CTA_LABEL} (se abre en una pestaña nueva)`
    : "Ver formas de donar",
} as const;

export function contactMailto(subject?: string): string {
  if (!subject) return `mailto:${CONTACT_EMAIL}`;
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

/** Transparencia de gastos operativos de la plataforma (override por env en
 *  el deployment real, si aplica). */
export const PLATFORM_EXPENSES_URL =
  process.env.NEXT_PUBLIC_EXPENSES_URL ?? "/contacto";
