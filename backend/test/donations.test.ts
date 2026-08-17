/**
 * Reglas del aporte económico que no tocan la red: qué importe se acepta y qué
 * cuerpo se le manda a Stripe.
 *
 * El cuerpo importa tanto como el importe: mandar `unit_amount` en dólares en
 * vez de centavos cobra cien veces de menos y nadie lo nota hasta ver el
 * extracto.
 */
import { describe, expect, it } from "vitest";
import {
  assertDonationAmount,
  InvalidDonationAmountError,
  MAX_DONATION_CENTS,
  MIN_DONATION_CENTS,
} from "@/modules/donations/domain/donation";
import { checkoutParams } from "@/modules/donations/infrastructure/stripe-checkout-params";

const request = (amountCents: number, interval: "once" | "monthly") => ({
  amountCents,
  interval,
  successUrl: "https://example.org/apoyanos/gracias",
  cancelUrl: "https://example.org/apoyanos",
});

describe("importe del aporte", () => {
  it("acepta los importes sugeridos", () => {
    for (const cents of [500, 1500, 3000]) {
      expect(() => assertDonationAmount(cents)).not.toThrow();
    }
  });

  it("rechaza por debajo del mínimo y por encima del techo", () => {
    expect(() => assertDonationAmount(MIN_DONATION_CENTS - 1)).toThrow(InvalidDonationAmountError);
    expect(() => assertDonationAmount(MAX_DONATION_CENTS + 1)).toThrow(InvalidDonationAmountError);
  });

  it("rechaza centavos fraccionarios", () => {
    expect(() => assertDonationAmount(1500.5)).toThrow(InvalidDonationAmountError);
  });
});

describe("cuerpo de la sesión de Stripe", () => {
  it("cobra una vez con el importe en centavos", () => {
    const params = checkoutParams(request(1500, "once"), "Aporte");
    expect(params.get("mode")).toBe("payment");
    expect(params.get("line_items[0][price_data][unit_amount]")).toBe("1500");
    expect(params.get("line_items[0][price_data][currency]")).toBe("usd");
    expect(params.get("line_items[0][price_data][recurring][interval]")).toBeNull();
  });

  it("crea una suscripción mensual cuando se pide recurrente", () => {
    const params = checkoutParams(request(3000, "monthly"), "Aporte");
    expect(params.get("mode")).toBe("subscription");
    expect(params.get("line_items[0][price_data][recurring][interval]")).toBe("month");
  });

  it("devuelve a nuestras propias páginas", () => {
    const params = checkoutParams(request(500, "once"), "Aporte");
    expect(params.get("success_url")).toBe("https://example.org/apoyanos/gracias");
    expect(params.get("cancel_url")).toBe("https://example.org/apoyanos");
  });
});
