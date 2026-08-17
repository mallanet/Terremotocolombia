import type { DonationInterval } from "./donation";

/**
 * Puerto de la pasarela. El dominio no sabe que existe Stripe: sabe que alguien
 * convierte un importe en una URL donde se paga.
 */
export interface CheckoutRequest {
  amountCents: number;
  interval: DonationInterval;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  /** URL alojada por la pasarela. El navegador va ahí a introducir la tarjeta. */
  url: string;
}

export interface CheckoutGateway {
  createSession(request: CheckoutRequest): Promise<CheckoutSession>;
}
