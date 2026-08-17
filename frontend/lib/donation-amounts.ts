/**
 * Importes sugeridos del aporte. En centavos, como los manda el backend.
 *
 * Están aquí y no en la base porque son tres números que cambian con una
 * decisión del equipo, no con una operación de usuario. Mismo trato que el
 * catálogo de materiales de la campaña.
 */
export const DONATION_CURRENCY_LABEL = "USD";

export const SUGGESTED_AMOUNTS_CENTS = [500, 1500, 3000] as const;

export const DONATION_INTERVALS = ["monthly", "once"] as const;
export type DonationInterval = (typeof DONATION_INTERVALS)[number];

export const INTERVAL_LABELS: Record<DonationInterval, string> = {
  monthly: "Aporte mensual",
  once: "Aporte único",
};

/** El backend aplica el mismo mínimo; aquí solo evita un viaje inútil. */
export const MIN_DONATION_CENTS = 100;
export const MAX_DONATION_CENTS = 500_000;

export function formatAmount(cents: number): string {
  const units = cents / 100;
  const decimals = Number.isInteger(units) ? 0 : 2;
  return `$${units.toFixed(decimals)}`;
}

/** Convierte lo que se escribe a mano ("15", "15.50") en centavos enteros. */
export function parseAmountToCents(raw: string): number | null {
  const normalized = raw.replace(",", ".").trim();
  if (!normalized) return null;
  const units = Number(normalized);
  if (!Number.isFinite(units) || units <= 0) return null;
  return Math.round(units * 100);
}
