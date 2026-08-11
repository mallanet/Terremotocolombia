/**
 * /api/volunteers — recibe un registro de voluntario. El form público de
 * /voluntario no tenía onSubmit ni action: los registros se perdían en
 * silencio. Este route es la pieza que finalmente los persiste.
 *
 * POST público → rateLimit (estricto: limit 3) + requireHuman (Turnstile) +
 * validate(zod). Acepta `turnstileToken` opcional en el body (como contact)
 * para que el gate siga funcionando si el mantenedor repone
 * TURNSTILE_SECRET_KEY (ver CLAUDE.md "Limitaciones conocidas" — hoy
 * requireHuman deja pasar sin el secreto configurado). Persiste el HASH de IP
 * (hashIp), nunca la IP cruda.
 */
import { Router } from "express";
import { z } from "zod";
import { asyncHandler, rateLimit, requireHuman, validate } from "@/middleware";
import { hashIp } from "@/lib/client-ip";
import { serviceUnavailable } from "@/lib/errors";
import * as service from "@/services/volunteers";

export const volunteersRouter = Router();

// Validación (contrato canónico del feature: name 1..120, phone 1..40,
// offer 1..2000, zone 1..200).
const createBody = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre debe tener entre 1 y 120 caracteres.")
    .max(120, "El nombre debe tener entre 1 y 120 caracteres."),
  phone: z
    .string()
    .trim()
    .min(1, "El teléfono debe tener entre 1 y 40 caracteres.")
    .max(40, "El teléfono debe tener entre 1 y 40 caracteres."),
  offer: z
    .string()
    .trim()
    .min(1, "Cuéntanos qué puedes ofrecer (1 a 2000 caracteres).")
    .max(2000, "Cuéntanos qué puedes ofrecer (1 a 2000 caracteres)."),
  zone: z
    .string()
    .trim()
    .min(1, "La zona debe tener entre 1 y 200 caracteres.")
    .max(200, "La zona debe tener entre 1 y 200 caracteres."),
  turnstileToken: z.string().optional(),
});

/**
 * @swagger
 * /api/volunteers:
 *   post:
 *     tags: [system]
 *     summary: Registra un voluntario (rate-limited)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone, offer, zone]
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *               offer: { type: string }
 *               zone: { type: string }
 *     responses:
 *       200:
 *         description: Registro recibido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean }
 *                 id: { type: string }
 *                 message: { type: string }
 *       400:
 *         description: Entrada inválida
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       429:
 *         description: Demasiados registros (rate limit)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       503:
 *         description: No se pudo guardar el registro
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
volunteersRouter.post(
  "/",
  rateLimit({ scope: "volunteers", limit: 3 }),
  requireHuman, // Cloudflare Turnstile: formulario público, vector de spam
  validate({ body: createBody }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createBody>;
    try {
      const volunteer = await service.createVolunteer({
        name: body.name,
        phone: body.phone,
        offer: body.offer,
        zone: body.zone,
        ipHash: hashIp(req),
      });
      res.status(200).json({
        ok: true,
        id: volunteer.id,
        message: "Registro recibido. El equipo de coordinación te contactará.",
      });
    } catch {
      throw serviceUnavailable("No se pudo guardar el registro.");
    }
  }),
);
