import { assertDonationAmount, type DonationInterval } from "../domain/donation";
import type { CheckoutGateway, CheckoutSession } from "../domain/checkout-gateway";

export interface StartDonationInput {
  amountCents: number;
  interval: DonationInterval;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Caso de uso: valida el importe y pide la sesión de pago.
 *
 * No guarda nada. Quien dona dinero no deja fila en nuestra base: el registro
 * de la transacción vive en Stripe, que es quien la cobra. Copiar aquí nombre,
 * correo o importe sería recolectar datos personales que no necesitamos para
 * nada.
 */
export class StartDonation {
  constructor(private readonly gateway: CheckoutGateway) {}

  async run(input: StartDonationInput): Promise<CheckoutSession> {
    assertDonationAmount(input.amountCents);
    return this.gateway.createSession(input);
  }
}
