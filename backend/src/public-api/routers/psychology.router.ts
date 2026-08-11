/**
 * Router `api/public/psychology` — portal exclusivo de psicólogos.
 *
 * Una sola ruta GET gateada por `psychology:access` (deny-by-default): es la
 * prueba de acceso del portal /psicologia y devuelve el perfil mínimo +
 * `resources` (vacío hasta que el mantenedor entregue el contenido real:
 * protocolos, casos, guardias). No es CRUD de modelo, por eso router a mano.
 *
 * La respuesta es POR-USUARIO: Cache-Control no-store (mismo criterio que
 * auth/me — nunca cacheable en un proxy compartido).
 */
import { Router } from "express";
import { asyncHandler, rateLimit } from "@/middleware";
import { requireCapability } from "@/middleware/auth";

export const psychologyRouter = Router();

/**
 * @swagger
 * /api/public/psychology:
 *   get:
 *     summary: Acceso al portal de psicólogos (capability psychology:access)
 *     tags: [Psychology]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Acceso concedido; perfil + recursos del portal }
 *       401: { description: No autenticado }
 *       403: { description: Sin la capacidad psychology:access }
 */
psychologyRouter.get(
  "/",
  rateLimit({ scope: "psychology", limit: 60 }),
  requireCapability("psychology:access"),
  asyncHandler(async (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({
      ok: true,
      user: { id: req.user!.id, email: req.user!.email },
      resources: [],
    });
  }),
);
