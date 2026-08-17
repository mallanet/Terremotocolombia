import type { Request, Response } from "express";
import { z } from "zod";
import { badRequest } from "@/lib/errors";
import { corsOrigins } from "@/config/env";
import { startDonation } from "../../donations-module";
import {
  DONATION_INTERVALS,
  InvalidDonationAmountError,
} from "../../domain/donation";

export const startDonationBody = z.object({
  amountCents: z.number().int(),
  interval: z.enum(DONATION_INTERVALS),
});

const SUCCESS_PATH = "/apoyanos/gracias";
const CANCEL_PATH = "/apoyanos";

/**
 * A dónde vuelve el navegador después de pagar.
 *
 * El origen sale de la lista de CORS, NUNCA del cuerpo de la petición. Aceptar
 * una URL del cliente y pasársela a Stripe como destino de redirección es un
 * open redirect de manual: cualquiera podría mandar a alguien a su propia
 * página desde un enlace que empieza en nuestro dominio.
 */
function resolveOrigin(req: Request): string {
  const origin = req.headers.origin;
  if (typeof origin === "string" && corsOrigins.includes(origin)) return origin;
  return corsOrigins[0] ?? "";
}

export async function startDonationHandler(req: Request, res: Response) {
  const body = startDonationBody.parse(req.body);
  const origin = resolveOrigin(req);

  try {
    const session = await startDonation.run({
      amountCents: body.amountCents,
      interval: body.interval,
      successUrl: `${origin}${SUCCESS_PATH}`,
      cancelUrl: `${origin}${CANCEL_PATH}`,
    });
    res.json({ ok: true, url: session.url });
  } catch (err) {
    if (err instanceof InvalidDonationAmountError) throw badRequest(err.message);
    throw err;
  }
}
