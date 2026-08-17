/**
 * Supresión de datos personales en los compromisos de la campaña (Ley 1581).
 *
 * NO se borra la fila: se anonimiza. Un compromiso ya recibido está sumado en
 * el balance público y respaldado por un certificado; borrarlo cambiaría una
 * cifra que ya se publicó y dejaría un certificado apuntando a la nada.
 * Anonimizar quita el dato personal (nombre, contacto, alias en el muro) y deja
 * intacto lo que no lo es: qué material llegó y cuándo.
 */
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { materialPledges } from "@/db/campaign-schema";

export const ANONYMIZED_DONOR = "Donante anónimo";

export function anonymizedPatch(): {
  donorName: string;
  donorContact: string;
  publicAlias: null;
  updatedAt: number;
} {
  return {
    donorName: ANONYMIZED_DONOR,
    donorContact: "",
    publicAlias: null,
    updatedAt: Date.now(),
  };
}

/**
 * Anonimiza los compromisos cuyo contacto coincide. Devuelve cuántas filas
 * cambió, para dejar constancia en la respuesta del panel.
 */
export async function anonymizePledgesByContact(contact: string): Promise<number> {
  const normalized = contact.trim().toLowerCase();
  if (!normalized) return 0;

  const db = await getDb();
  const rows = await db
    .update(materialPledges)
    .set(anonymizedPatch())
    // Case-insensitive: el correo se guarda tal como lo escribió la persona, y
    // quien pide la supresión rara vez lo escribe igual la segunda vez.
    .where(sql`lower(${materialPledges.donorContact}) = ${normalized}`)
    .returning({ id: materialPledges.id });

  return rows.length;
}
