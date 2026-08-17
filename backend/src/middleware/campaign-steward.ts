/**
 * Auth del responsable de un punto de recolección.
 *
 * Un token opaco que la persona lleva en su enlace privado, validado contra el
 * sha256 guardado en campaign_site_stewards. No hay usuario ni contraseña — la
 * persona que atiende un punto un sábado por la mañana no va a crearse una
 * cuenta.
 *
 * El responsable resuelto queda en res.locals.steward, y SIEMPRE acota lo que
 * el handler puede tocar a su propio punto: el siteId sale de aquí, nunca del
 * cuerpo de la petición.
 *
 * OJO: esto es middleware, no un handler final, así que NO usa asyncHandler.
 * asyncHandler solo propaga el error a next(); cuando la función termina bien
 * no llama a next(), y la petición se queda colgada para siempre.
 */
import type { RequestHandler } from "express";
import { unauthorized } from "@/lib/errors";
import { stewards } from "@/services/campaign";

export const STEWARD_HEADER = "x-campaign-steward-token";

async function resolveSteward(
  req: Parameters<RequestHandler>[0],
  res: Parameters<RequestHandler>[1],
): Promise<void> {
  const raw = req.headers[STEWARD_HEADER];
  const token = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  if (!token) throw unauthorized("No autorizado.");

  const steward = await stewards.findStewardByToken(token);
  if (!steward) throw unauthorized("No autorizado.");

  res.locals.steward = steward;
}

export const requireCampaignSteward: RequestHandler = (req, res, next) => {
  resolveSteward(req, res).then(() => next(), next);
};
