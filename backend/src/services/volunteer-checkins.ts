/**
 * Service de check-ins de voluntarios: evidencia de quién estuvo dónde y qué
 * dejó (caja/espacio) en un centro de acopio o punto de entrega. La credencial
 * es el CÓDIGO único del voluntario (volunteers.code) — sin login.
 *
 * La foto sigue el patrón de reportes: data-URL → R2 si está configurado,
 * base64 en DB como red de durabilidad (lib/r2 persistPhotoDataUrl).
 * Sin transacciones interactivas (invariante Workers): una sola sentencia.
 */
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { persistPhotoDataUrl } from "@/lib/r2";
import { getVolunteerByCode } from "@/services/volunteers";

const { volunteerCheckins, volunteers } = schema;

const LIST_LIMIT = 500;

/** Fila del panel admin. `photo` solo si es URL de CDN (nunca base64 crudo). */
export interface VolunteerCheckinDTO {
  id: string;
  volunteerName: string;
  volunteerCode: string;
  place: string;
  note: string;
  hasPhoto: boolean;
  photo: string | null;
  createdAt: number;
}

/**
 * Crea el check-in del dueño del código. Null si el código no existe — el
 * route lo traduce a 400 (el voluntario debe poder corregir un typo).
 */
export async function createVolunteerCheckin(input: {
  code: string;
  place: string;
  note: string;
  photo?: string | null;
}): Promise<{ id: string } | null> {
  const volunteer = await getVolunteerByCode(input.code);
  if (!volunteer) return null;
  const id = crypto.randomUUID();
  let stored: string | null = null;
  if (input.photo) {
    ({ stored } = await persistPhotoDataUrl(input.photo, "volunteer_checkins", id));
  }
  const db = await getDb();
  await db.insert(volunteerCheckins).values({
    id,
    volunteerId: volunteer.id,
    place: input.place,
    note: input.note,
    photo: stored,
    createdAt: Date.now(),
  });
  return { id };
}

/** Lista para el panel admin, con nombre y código del voluntario resueltos. */
export async function listVolunteerCheckins(): Promise<VolunteerCheckinDTO[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: volunteerCheckins.id,
      place: volunteerCheckins.place,
      note: volunteerCheckins.note,
      photo: volunteerCheckins.photo,
      createdAt: volunteerCheckins.createdAt,
      volunteerName: volunteers.name,
      volunteerCode: volunteers.code,
    })
    .from(volunteerCheckins)
    .innerJoin(volunteers, eq(volunteerCheckins.volunteerId, volunteers.id))
    .orderBy(desc(volunteerCheckins.createdAt))
    .limit(LIST_LIMIT);
  return rows.map((r) => ({
    id: r.id,
    volunteerName: r.volunteerName,
    volunteerCode: r.volunteerCode,
    place: r.place,
    note: r.note,
    hasPhoto: Boolean(r.photo),
    photo: r.photo && !r.photo.startsWith("data:") ? r.photo : null,
    createdAt: Number(r.createdAt),
  }));
}
