/**
 * Acciones de dominio sobre voluntarios que no encajan en el CRUD de la
 * fábrica: enviar un mensaje por correo al voluntario desde el panel
 * ("comunicación interna" del equipo con la persona registrada).
 *
 * Se monta en /api/public/volunteers junto al router CRUD generado (no
 * colisiona: la fábrica no tiene POST /:id/message). Gates del ESLint:
 * rateLimit + requireCapability; la escritura además writeAudit.
 */
import { Router } from "express";
import { z } from "zod";
import { asyncHandler, rateLimit, validate } from "@/middleware";
import { requireCapability } from "@/middleware/auth";
import { writeAudit } from "@/auth/audit";
import { badRequest, notFound, serviceUnavailable } from "@/lib/errors";
import { sendVolunteerMessage } from "@/auth/mailer";
import * as service from "@/services/volunteers";

export const volunteersActionsRouter = Router();

const messageBody = z.object({
  subject: z.string().trim().min(1, "Indica el asunto.").max(200),
  message: z.string().trim().min(1, "Indica el mensaje.").max(5000),
});

const idParams = z.object({ id: z.string().min(1) });

// El campo contact es "WhatsApp o correo": solo se puede enviar email si ES
// un correo. Regex simple (no z.email): basta distinguir los dos casos.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @swagger
 * /api/public/volunteers/{id}/message:
 *   post:
 *     summary: Envía un correo al voluntario y lo marca como contactado
 *     tags: [Volunteers]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subject, message]
 *             properties:
 *               subject: { type: string, maxLength: 200 }
 *               message: { type: string, maxLength: 5000 }
 *     responses:
 *       200: { description: Correo enviado; estado pasa a contacted si estaba pending }
 *       400: { description: El contacto del registro no es un correo }
 *       404: { description: Voluntario no encontrado }
 *       503: { description: SMTP no configurado en el backend }
 */
volunteersActionsRouter.post(
  "/:id/message",
  rateLimit({ scope: "volunteers:message", limit: 10 }),
  requireCapability("volunteer:edit"),
  validate({ params: idParams, body: messageBody }),
  asyncHandler(async (req, res) => {
    const id = (req.params as { id: string }).id;
    const volunteer = await service.getVolunteerById(id);
    if (!volunteer) throw notFound("Voluntario no encontrado.");
    if (!EMAIL_RE.test(volunteer.contact)) {
      throw badRequest(
        "El contacto de este registro no es un correo (parece WhatsApp); contáctalo por ese canal.",
      );
    }
    const { subject, message } = req.body as z.infer<typeof messageBody>;
    const { sent } = await sendVolunteerMessage(volunteer.contact, subject, message);
    if (!sent) {
      throw serviceUnavailable("SMTP no configurado en el backend: no se pudo enviar el correo.");
    }
    // pending → contacted solo si NADIE lo movió ya (claim condicional).
    await service.markVolunteerContacted(id);
    await writeAudit(req, {
      action: "volunteer.message",
      targetType: "volunteer",
      targetId: id,
      metadata: { subject },
    });
    res.json({ ok: true, sentTo: volunteer.contact });
  }),
);
