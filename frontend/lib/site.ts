import { deploymentConfig } from "@/lib/deployment-config";

/** Dominio público del sitio (config/deployment.config.json → domains.web). */
export const SITE_URL = `https://${deploymentConfig.domains.web}`;
export const SITE_NAME = `${deploymentConfig.productName} · ${deploymentConfig.orgName}`;
/** Schema.org / PWA mark — Mallanet isotipo on ink (never Epicentro). */
export const SITE_LOGO = "/icon-512.png";
/** Nav / light chrome — official Mallanet isotipo for light surfaces. */
export const SITE_NAV_LOGO = "/brand/isotipo-oscuro.svg";
/** Dark chrome / OG wordmark. */
export const SITE_WORDMARK_ON_DARK = "/brand/logo-claro.svg";
export const SITE_BRAND_NAME = deploymentConfig.orgName;
export const SITE_PRODUCT_NAME = deploymentConfig.productName;

export const CONTACT_EMAIL = deploymentConfig.contactEmail;

/** Comunidad Discord de Mallanet (voluntariado / coordinación). */
export const DISCORD_INVITE_URL = "https://discord.gg/mallanet";

export function contactMailto(subject?: string): string {
  if (!subject) return `mailto:${CONTACT_EMAIL}`;
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

/** Transparencia de gastos operativos de la plataforma (override por env en
 *  el deployment real, si aplica). */
export const PLATFORM_EXPENSES_URL =
  process.env.NEXT_PUBLIC_EXPENSES_URL ?? "/contacto";
