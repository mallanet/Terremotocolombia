/**
 * /api/voluntariado — superficie PÚBLICA y anónima del voluntario asignado.
 * La credencial es el TOKEN del link del correo (48 hex aleatorios, único por
 * asignación): quien lo tiene ve y responde SU asignación. Sin login, sin
 * Turnstile — el token es un secreto de un solo uso por persona, mismo criterio
 * que el link de aceptar invitación. rateLimit estricto contra fuerza bruta.
 *
 * NUNCA expone PII de otros: solo el nombre del voluntario dueño del token y
 * los datos de la tarea (que son operativos, no personales).
 */
import { Router } from "express";
import { z } from "zod";
import { asyncHandler, rateLimit, validate } from "@/middleware";
import { notFound } from "@/lib/errors";
import * as service from "@/services/volunteer-tasks";

export const voluntariadoRouter = Router();

const respondBody = z.object({
  action: z.enum(["aceptar", "rechazar", "terminar"]),
});

const ACTION_MAP = {
  aceptar: "accept",
  rechazar: "decline",
  terminar: "done",
} as const;

/**
 * @swagger
 * /api/voluntariado/{token}:
 *   get:
 *     summary: Detalle de la asignación del voluntario (por token del correo)
 *     tags: [system]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Asignación con la tarea (puntos y transporte) }
 *       404: { description: Token inválido }
 */
voluntariadoRouter.get(
  "/:token",
  rateLimit({ scope: "voluntariado:read", limit: 30 }),
  asyncHandler(async (req, res) => {
    const token = (req.params as { token: string }).token;
    const assignment = await service.getAssignmentByToken(token);
    if (!assignment) throw notFound("Este enlace no es válido o ya no está vigente.");
    res.set("Cache-Control", "no-store");
    res.json(assignment);
  }),
);

/**
 * @swagger
 * /api/voluntariado/{token}/responder:
 *   post:
 *     summary: Responde la asignación (aceptar / rechazar / terminar)
 *     tags: [system]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action: { type: string, enum: [aceptar, rechazar, terminar] }
 *     responses:
 *       200: { description: Nuevo estado de la asignación y de la tarea }
 *       404: { description: Token inválido o transición no permitida }
 */
// eslint-disable-next-line local/user-facing-mutation-needs-guard -- la credencial es el token del link del correo (secreto único por asignación); sin Turnstile por diseño, protegido por rateLimit anti-fuerza-bruta
voluntariadoRouter.post(
  "/:token/responder",
  rateLimit({ scope: "voluntariado:respond", limit: 10 }),
  validate({ body: respondBody }),
  asyncHandler(async (req, res) => {
    const token = (req.params as { token: string }).token;
    const { action } = req.body as z.infer<typeof respondBody>;
    const result = await service.respondToAssignment(token, ACTION_MAP[action]);
    if (!result) {
      throw notFound("Este enlace no es válido o la acción no aplica al estado actual.");
    }
    res.json({ ok: true, ...result });
  }),
);
