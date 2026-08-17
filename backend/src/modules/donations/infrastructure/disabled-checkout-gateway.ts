import { serviceUnavailable } from "@/lib/errors";
import type { CheckoutGateway, CheckoutSession } from "../domain/checkout-gateway";

/**
 * Lo que corre cuando el despliegue no tiene pasarela configurada.
 *
 * Falla ruidoso y con un mensaje que se puede leer en pantalla, en vez de
 * fingir que cobró. La plantilla arranca sin Stripe, y el formulario avisa.
 */
export class DisabledCheckoutGateway implements CheckoutGateway {
  async createSession(): Promise<CheckoutSession> {
    throw serviceUnavailable("Los aportes con tarjeta no están habilitados en este despliegue.");
  }
}
