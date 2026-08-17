"use client";

/**
 * Apertura de la pasarela de pago. Mismo patrón que el resto: la mutación va
 * por apiSend y el componente no hace fetch.
 */
import { useMutation } from "@tanstack/react-query";
import { apiSend } from "@/lib/api";
import type { DonationInterval } from "@/lib/donation-amounts";

export interface DonationCheckoutInput {
  amountCents: number;
  interval: DonationInterval;
  turnstileToken?: string;
}

export interface DonationCheckoutResponse {
  ok: boolean;
  /** URL alojada por Stripe. El navegador se va ahí a poner la tarjeta. */
  url: string;
}

export function useDonationCheckout() {
  return useMutation({
    mutationFn: (input: DonationCheckoutInput) =>
      apiSend<DonationCheckoutResponse>("POST", "/api/donaciones/checkout", input),
  });
}
