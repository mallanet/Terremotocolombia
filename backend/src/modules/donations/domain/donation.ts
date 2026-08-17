/**
 * Reglas del aporte económico. Puras: ni HTTP, ni env, ni Stripe.
 *
 * El importe viaja en CENTAVOS y como entero. Un `number` con decimales para
 * dinero es la forma clásica de cobrar 14,999999 dólares.
 */
export const DONATION_CURRENCY = "usd";

export const DONATION_INTERVALS = ["once", "monthly"] as const;
export type DonationInterval = (typeof DONATION_INTERVALS)[number];

/** Por debajo de un dólar, la comisión se come el aporte entero. */
export const MIN_DONATION_CENTS = 100;

/**
 * Techo deliberado. Un aporte mayor no se rechaza por desconfianza: se coordina
 * a mano, porque a esa cantidad conviene hablar con quien dona antes de cobrar.
 */
export const MAX_DONATION_CENTS = 500_000;

export class InvalidDonationAmountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidDonationAmountError";
  }
}

export function assertDonationAmount(amountCents: number): void {
  if (!Number.isInteger(amountCents)) {
    throw new InvalidDonationAmountError("El importe debe ser un número entero de centavos.");
  }
  if (amountCents < MIN_DONATION_CENTS) {
    throw new InvalidDonationAmountError("El importe mínimo es de 1 dólar.");
  }
  if (amountCents > MAX_DONATION_CENTS) {
    throw new InvalidDonationAmountError(
      "Para un aporte de ese tamaño, escríbenos y lo coordinamos contigo.",
    );
  }
}
