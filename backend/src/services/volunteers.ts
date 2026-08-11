/**
 * Service de voluntarios. El form público de /voluntario no tenía onSubmit —
 * los registros se perdían en silencio (ver AGENTS del feature). Este service
 * persiste el registro con el HASH de IP (nunca la IP cruda — contexto
 * humanitario), igual que contact.ts.
 *
 * La validación de longitudes/formato vive en el route y en el resource de
 * api/public (zod). Aquí solo persiste. Devuelve solo el id en create (el
 * route arma la respuesta pública); el DTO allowlist NUNCA expone ip_hash.
 *
 * PROHIBIDO db.transaction(...) aquí: corre en Cloudflare Workers, donde el
 * driver HTTP de Neon no soporta transacciones interactivas (ver CLAUDE.md
 * "Limitaciones conocidas"). Solo sentencias únicas.
 */
import { desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";

const { volunteers } = schema;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Estados válidos del ciclo de vida de un voluntario. */
export type VolunteerStatus = "pending" | "contacted" | "active" | "declined";

/** Voluntario expuesto al admin. Allowlist: NUNCA incluye ip_hash. */
export interface VolunteerDTO {
  id: string;
  name: string;
  contact: string;
  offer: string;
  zone: string;
  availability: string | null;
  offerTypes: string[] | null;
  digitalSkills: string[] | null;
  crisisExperience: boolean | null;
  fieldCity: string | null;
  rescueTraining: boolean | null;
  fieldRole: string | null;
  ownVehicle: boolean | null;
  source: string | null;
  status: VolunteerStatus;
  notes: string | null;
  createdAt: number;
  updatedAt: number | null;
}

export interface VolunteerStats {
  total: number;
  pending: number;
  last24h: number;
}

export async function createVolunteer(input: {
  name: string;
  contact: string;
  offer: string;
  zone: string;
  availability: string;
  offerTypes: string[];
  digitalSkills?: string[];
  crisisExperience?: boolean;
  fieldCity?: string;
  rescueTraining?: boolean;
  fieldRole?: string;
  ownVehicle?: boolean;
  source?: string;
  ipHash?: string | null;
}): Promise<{ id: string }> {
  const id = crypto.randomUUID();
  const db = await getDb();
  const now = Date.now();
  await db.insert(volunteers).values({
    id,
    name: input.name,
    contact: input.contact,
    offer: input.offer,
    zone: input.zone,
    availability: input.availability,
    offerTypes: input.offerTypes,
    digitalSkills: input.digitalSkills ?? null,
    crisisExperience: input.crisisExperience ?? null,
    fieldCity: input.fieldCity ?? null,
    rescueTraining: input.rescueTraining ?? null,
    fieldRole: input.fieldRole ?? null,
    ownVehicle: input.ownVehicle ?? null,
    source: input.source ?? null,
    status: "pending",
    ipHash: input.ipHash ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return { id };
}

/** Lista de voluntarios para el panel admin (DTO allowlist, sin ip_hash). */
export async function listVolunteers(): Promise<VolunteerDTO[]> {
  const db = await getDb();
  const rows = await db
    .select({
      id: volunteers.id,
      name: volunteers.name,
      contact: volunteers.contact,
      offer: volunteers.offer,
      zone: volunteers.zone,
      availability: volunteers.availability,
      offerTypes: volunteers.offerTypes,
      digitalSkills: volunteers.digitalSkills,
      crisisExperience: volunteers.crisisExperience,
      fieldCity: volunteers.fieldCity,
      rescueTraining: volunteers.rescueTraining,
      fieldRole: volunteers.fieldRole,
      ownVehicle: volunteers.ownVehicle,
      source: volunteers.source,
      status: volunteers.status,
      notes: volunteers.notes,
      createdAt: volunteers.createdAt,
      updatedAt: volunteers.updatedAt,
    })
    .from(volunteers)
    .orderBy(desc(volunteers.createdAt));
  return rows.map(toDTO);
}

/** Un voluntario por id como DTO (allowlist, sin ip_hash), o null si no existe. */
export async function getVolunteerById(id: string): Promise<VolunteerDTO | null> {
  const db = await getDb();
  const rows = await db
    .select({
      id: volunteers.id,
      name: volunteers.name,
      contact: volunteers.contact,
      offer: volunteers.offer,
      zone: volunteers.zone,
      availability: volunteers.availability,
      offerTypes: volunteers.offerTypes,
      digitalSkills: volunteers.digitalSkills,
      crisisExperience: volunteers.crisisExperience,
      fieldCity: volunteers.fieldCity,
      rescueTraining: volunteers.rescueTraining,
      fieldRole: volunteers.fieldRole,
      ownVehicle: volunteers.ownVehicle,
      source: volunteers.source,
      status: volunteers.status,
      notes: volunteers.notes,
      createdAt: volunteers.createdAt,
      updatedAt: volunteers.updatedAt,
    })
    .from(volunteers)
    .where(eq(volunteers.id, id))
    .limit(1);
  const r = rows[0];
  return r ? toDTO(r) : null;
}

/**
 * Actualiza status y/o notes (únicos campos editables) y devuelve el DTO
 * actualizado, o null si el voluntario no existe. UPDATE atómico de una sola
 * sentencia (sin transacción interactiva — ver invariante Workers arriba).
 */
export async function updateVolunteer(
  id: string,
  patch: { status?: VolunteerStatus; notes?: string | null },
): Promise<VolunteerDTO | null> {
  const db = await getDb();
  const updatedAt = Date.now();
  const values: Record<string, unknown> = { updatedAt };
  if (patch.status !== undefined) values.status = patch.status;
  if (patch.notes !== undefined) values.notes = patch.notes;
  await db.update(volunteers).set(values).where(eq(volunteers.id, id));
  return getVolunteerById(id);
}

/**
 * Marca pending → contacted SOLO si sigue pending (claim condicional de una
 * sentencia — sin transacción interactiva, invariante Workers). Se usa tras
 * enviar el mensaje al voluntario desde el panel: si alguien ya lo movió de
 * estado, no lo pisamos.
 */
export async function markVolunteerContacted(id: string): Promise<void> {
  const db = await getDb();
  await db
    .update(volunteers)
    .set({ status: "contacted", updatedAt: Date.now() })
    .where(sql`${volunteers.id} = ${id} AND ${volunteers.status} = 'pending'`);
}

export async function getVolunteerStats(): Promise<VolunteerStats> {
  const db = await getDb();
  const cutoff = Date.now() - DAY_MS;
  const rows = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
      pending: sql<number>`COUNT(*) FILTER (WHERE ${volunteers.status} = 'pending')::int`,
      last24h: sql<number>`COUNT(*) FILTER (WHERE ${volunteers.createdAt} >= ${cutoff})::int`,
    })
    .from(volunteers);
  const row = rows[0];
  return {
    total: Number(row?.total ?? 0),
    pending: Number(row?.pending ?? 0),
    last24h: Number(row?.last24h ?? 0),
  };
}

function toDTO(r: {
  id: string;
  name: string;
  contact: string;
  offer: string;
  zone: string;
  availability: string | null;
  offerTypes: string[] | null;
  digitalSkills: string[] | null;
  crisisExperience: boolean | null;
  fieldCity: string | null;
  rescueTraining: boolean | null;
  fieldRole: string | null;
  ownVehicle: boolean | null;
  source: string | null;
  status: string;
  notes: string | null;
  createdAt: number;
  updatedAt: number | null;
}): VolunteerDTO {
  return {
    id: r.id,
    name: r.name,
    contact: r.contact,
    offer: r.offer,
    zone: r.zone,
    availability: r.availability,
    offerTypes: r.offerTypes,
    digitalSkills: r.digitalSkills,
    crisisExperience: r.crisisExperience,
    fieldCity: r.fieldCity,
    rescueTraining: r.rescueTraining,
    fieldRole: r.fieldRole,
    ownVehicle: r.ownVehicle,
    source: r.source,
    status: r.status as VolunteerStatus,
    notes: r.notes,
    createdAt: Number(r.createdAt),
    updatedAt: r.updatedAt === null ? null : Number(r.updatedAt),
  };
}
