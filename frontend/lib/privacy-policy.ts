/** Datos legales de la Política de Privacidad del operador (Mallanet.org).
 *  Contacto público: solo correo + web — sin teléfono ni dirección postal. */
import { deploymentConfig } from "@/lib/deployment-config";

export const PRIVACY_EFFECTIVE_DATE = "1 de enero de 2026";
export const PRIVACY_CONTACT_EMAIL = deploymentConfig.contactEmail;
export const PRIVACY_ORG_URL = "https://mallanet.org";
export const PRIVACY_COMPANY_NAME = deploymentConfig.orgName;
export const PRIVACY_COMPANY_ALIASES = deploymentConfig.domains.web;

export function privacyMailto(subject?: string): string {
  if (!subject) return `mailto:${PRIVACY_CONTACT_EMAIL}`;
  return `mailto:${PRIVACY_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

/** Clave en localStorage cuando el usuario acepta la política en el modal inicial. */
export const PRIVACY_CONSENT_STORAGE_KEY = "disaster-response-privacy-consent-v1";
