import { DONATION_CURRENCY } from "../domain/donation";
import type { CheckoutRequest } from "../domain/checkout-gateway";

/**
 * Traduce la petición al formulario que espera la API de Stripe.
 *
 * Va aparte del cliente HTTP para poder probarlo sin red: el cuerpo de esta
 * llamada es la parte que de verdad se puede escribir mal (un `unit_amount` en
 * dólares en vez de centavos cobra cien veces de menos, y nadie se entera hasta
 * ver el extracto).
 *
 * `price_data` en vez de un `price` creado antes: así el importe lo elige quien
 * dona, incluido el recurrente, sin que nadie tenga que crear un producto en
 * Stripe por cada cantidad posible.
 */
export function checkoutParams(request: CheckoutRequest, productName: string): URLSearchParams {
  const monthly = request.interval === "monthly";
  const params = new URLSearchParams({
    mode: monthly ? "subscription" : "payment",
    success_url: request.successUrl,
    cancel_url: request.cancelUrl,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": DONATION_CURRENCY,
    "line_items[0][price_data][unit_amount]": String(request.amountCents),
    "line_items[0][price_data][product_data][name]": productName,
  });

  if (monthly) {
    params.set("line_items[0][price_data][recurring][interval]", "month");
  }

  return params;
}
