import { Router } from "express";
import { asyncHandler, rateLimit, requireHuman, validate } from "@/middleware";
import { startDonationBody, startDonationHandler } from "./donations-controller";

/**
 * POST /api/donaciones/checkout lo llama el formulario público, así que es
 * anónimo por necesidad: lo protegen Turnstile y el rate-limit.
 *
 * Sin bloque @swagger a propósito, igual que /api/needs: abre una sesión de
 * pago con credencial de servicio y no publicamos ese contrato en /api/docs
 * como superficie de abuso.
 */
export function createDonationsRouter(): Router {
  const router = Router();
  router.post(
    "/checkout",
    rateLimit({ scope: "donations:checkout", limit: 10 }),
    requireHuman,
    validate({ body: startDonationBody }),
    asyncHandler(startDonationHandler),
  );
  return router;
}
