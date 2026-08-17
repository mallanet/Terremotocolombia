import { badGateway } from "@/lib/errors";
import { checkoutParams } from "./stripe-checkout-params";
import type {
  CheckoutGateway,
  CheckoutRequest,
  CheckoutSession,
} from "../domain/checkout-gateway";

const STRIPE_SESSIONS_URL = "https://api.stripe.com/v1/checkout/sessions";
const TIMEOUT_MS = 10_000;

/**
 * Adaptador HTTP contra Stripe. Sin el SDK a propósito: una llamada
 * form-encoded con `fetch` no justifica una dependencia más, y `fetch` es lo
 * único que hay garantizado en Workers.
 *
 * La clave secreta NUNCA sale de aquí, y el mensaje de error de Stripe tampoco
 * llega al navegador: puede describir la configuración de la cuenta.
 */
export class StripeCheckoutGateway implements CheckoutGateway {
  constructor(
    private readonly secretKey: string,
    private readonly productName: string,
  ) {}

  async createSession(request: CheckoutRequest): Promise<CheckoutSession> {
    const response = await fetch(STRIPE_SESSIONS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: checkoutParams(request, this.productName).toString(),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(`[donations] Stripe respondió ${response.status} al crear la sesión`);
      throw badGateway("No pudimos abrir la pasarela de pago. Inténtalo de nuevo.");
    }

    const session = (await response.json()) as { url?: unknown };
    if (typeof session.url !== "string" || !session.url) {
      throw badGateway("La pasarela no devolvió un enlace de pago.");
    }

    return { url: session.url };
  }
}
