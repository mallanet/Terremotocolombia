import { donationsEnv } from "./donations-env";
import { StartDonation } from "./application/start-donation";
import type { CheckoutGateway } from "./domain/checkout-gateway";
import { DisabledCheckoutGateway } from "./infrastructure/disabled-checkout-gateway";
import { StripeCheckoutGateway } from "./infrastructure/stripe-checkout-gateway";

/** Lo que quien dona ve como concepto en el extracto de su tarjeta. */
const PRODUCT_NAME = "Aporte a la plataforma";

function createGateway(): CheckoutGateway {
  // OFF por defecto: sin ENABLE_STRIPE_DONATIONS=true no se cobra nada, aunque
  // la clave haya quedado puesta en el entorno.
  if (!donationsEnv.ENABLE_STRIPE_DONATIONS || !donationsEnv.STRIPE_SECRET_KEY) {
    return new DisabledCheckoutGateway();
  }
  return new StripeCheckoutGateway(donationsEnv.STRIPE_SECRET_KEY, PRODUCT_NAME);
}

/** Composition root: el único sitio del módulo que lee `env`. */
export const startDonation = new StartDonation(createGateway());
