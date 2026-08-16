/**
 * Auth del responsable de un punto de recolección.
 *
 * Mismo trato que el POC de hospital (supply-auth.ts): un token opaco que la
 * persona lleva en su enlace privado, validado contra el sha256 guardado en
 * campaign_site_stewards. No hay usuario ni contraseña — la persona que atiende
 * un punto de acopio un sábado por la mañana no va a crearse una cuenta.
 *
 * El responsable resuelto queda en res.locals.steward, y SIEMPRE acota lo que
 * el handler puede tocar a su propio punto: el siteId sale de aquí, nunca del
 * cuerpo de la petición.
 */
import type { RequestHandler } from "express";
import { unauthorized } from "@/lib/errors";
import { asyncHandler } from "@/middleware";
import { stewards } from "@/services/campaign";

export const STEWARD_HEADER = "x-campaign-steward-token";

export const requireCampaignSteward: RequestHandler = asyncHandler(async (req, res) => {
  const raw = req.headers[STEWARD_HEADER];
  const token = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  if (!token) throw unauthorized("No autorizado.");

  const steward = await stewards.findStewardByToken(token);
  if (!steward) throw unauthorized("No autorizado.");

  res.locals.steward = steward;
});
