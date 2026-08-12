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
import express from "express";
import { z } from "zod";
import { asyncHandler, rateLimit, requireHuman, validate } from "@/middleware";
import { badRequest, notFound, payloadTooLarge } from "@/lib/errors";
import * as service from "@/services/volunteer-tasks";
import * as checkins from "@/services/volunteer-checkins";
import { getVolunteerByCode } from "@/services/volunteers";
import { isValidPhotoDataUrl, MAX_REPORT_PHOTO_CHARS } from "@/services/reports";

export const voluntariadoRouter = Router();

const respondBody = z.object({
  action: z.enum(["aceptar", "rechazar", "terminar"]),
});

// Código de voluntario: 6 dígitos (se acepta con espacios, se normaliza).
const codeField = z.string().trim().min(4).max(12);

const verifyBody = z.object({
  code: codeField,
  turnstileToken: z.string().optional(),
});

const checkinBody = z.object({
  code: codeField,
  place: z
    .string()
    .trim()
    .min(1, "Indica el lugar (centro de acopio, punto de entrega).")
    .max(200),
  note: z.string().trim().max(1000, "La nota no puede pasar de 1000 caracteres.").optional().default(""),
  photo: z.string().max(MAX_REPORT_PHOTO_CHARS, "La foto es demasiado grande.").nullable().optional(),
  turnstileToken: z.string().optional(),
});

// Parser JSON ampliado solo para el check-in con foto (mismo criterio que reports).
const jsonPhoto = express.json({ limit: "2mb" });

/**
 * @swagger
 * /api/voluntariado/verificar-codigo:
 *   post:
 *     summary: Verifica el código único de un voluntario
 *     tags: [system]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string, description: "Código de 6 dígitos" }
 *     responses:
 *       200: { description: Código válido; devuelve el nombre del voluntario }
 *       404: { description: Código inválido }
 *       429: { description: Demasiados intentos (anti fuerza bruta) }
 */
voluntariadoRouter.post(
  "/verificar-codigo",
  rateLimit({ scope: "voluntariado:verify", limit: 10 }),
  requireHuman,
  validate({ body: verifyBody }),
  asyncHandler(async (req, res) => {
    const { code } = req.body as z.infer<typeof verifyBody>;
    const volunteer = await getVolunteerByCode(code);
    if (!volunteer) throw notFound("El código no es válido. Revísalo e inténtalo de nuevo.");
    res.json({ ok: true, name: volunteer.name });
  }),
);

/**
 * @swagger
 * /api/voluntariado/checkin:
 *   post:
 *     summary: Check-in de voluntario en un punto (lugar + qué dejó + foto)
 *     tags: [system]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, place]
 *             properties:
 *               code: { type: string }
 *               place: { type: string }
 *               note: { type: string, description: "Qué dejó: caja, espacio…" }
 *               photo: { type: string, description: "data URL base64 (opcional)" }
 *     responses:
 *       201: { description: Check-in registrado }
 *       400: { description: Código inválido o foto inválida }
 *       429: { description: Demasiados intentos }
 */
voluntariadoRouter.post(
  "/checkin",
  jsonPhoto,
  rateLimit({ scope: "voluntariado:checkin", limit: 10 }),
  requireHuman,
  validate({ body: checkinBody }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof checkinBody>;
    if (body.photo) {
      if (!isValidPhotoDataUrl(body.photo)) {
        throw badRequest("La foto debe ser una imagen JPG, PNG o WebP válida.");
      }
      if (body.photo.length > MAX_REPORT_PHOTO_CHARS) {
        throw payloadTooLarge("La foto es demasiado grande. Usa una imagen más liviana.");
      }
    }
    const created = await checkins.createVolunteerCheckin({
      code: body.code,
      place: body.place,
      note: body.note,
      photo: body.photo ?? null,
    });
    if (!created) {
      throw badRequest("El código no es válido. Revísalo e inténtalo de nuevo.");
    }
    res.status(201).json({ ok: true, id: created.id });
  }),
);

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
