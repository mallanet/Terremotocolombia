/**
 * Recurso `api/public/volunteer-checkins` — SOLO LECTURA para el panel admin.
 * Los check-ins los crean los voluntarios por la vía pública (código único,
 * routes/voluntariado.ts); aquí el equipo solo consulta quién estuvo dónde.
 * Reusa la capacidad `volunteer` (mismo dominio que volunteers/volunteer-tasks).
 */
import { z } from "zod";
import { createCrudRouter, type CrudResource } from "@/public-api/crud-factory";
import * as service from "@/services/volunteer-checkins";

const responseSchema = z.object({
  id: z.string(),
  volunteerName: z.string(),
  volunteerCode: z.string(),
  place: z.string(),
  note: z.string(),
  hasPhoto: z.boolean(),
  photo: z.string().nullable(),
  createdAt: z.number(),
});

export const volunteerCheckinsResource: CrudResource<
  Awaited<ReturnType<typeof service.listVolunteerCheckins>>[number],
  unknown,
  unknown,
  unknown
> = {
  capability: "volunteer",
  auditType: "volunteer_checkin",
  schemas: { response: responseSchema },
  ops: {
    list: () => service.listVolunteerCheckins(),
  },
};

export const publicVolunteerCheckinsRouter = createCrudRouter(volunteerCheckinsResource);
