/**
 * Lectura de compromisos para el panel.
 *
 * Aquí SÍ aparece el contacto de quien dona: el equipo tiene que poder avisar
 * a alguien de que su punto cambió de horario. Por eso la superficie es
 * capability-gated y auditada, y por eso no se expone en ninguna lectura
 * pública. Sin escritura: un compromiso lo cierra el responsable del punto
 * cuando el material llega, no el panel.
 */
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { campaignSites, materialPledges } from "@/db/campaign-schema";

export interface PledgeAdminDTO {
  id: string;
  code: string;
  donorName: string;
  donorContact: string;
  items: Array<{ material: string; quantity: number; unit: string }>;
  status: string;
  siteName: string | null;
  city: string | null;
  publicAlias: string | null;
  note: string;
  /** Foto que adjuntó quien dona. Solo aquí: ninguna lectura pública la expone. */
  photo: string | null;
  createdAt: number;
}

const columns = {
  id: materialPledges.id,
  code: materialPledges.code,
  donorName: materialPledges.donorName,
  donorContact: materialPledges.donorContact,
  items: materialPledges.items,
  status: materialPledges.status,
  publicAlias: materialPledges.publicAlias,
  note: materialPledges.note,
  photo: materialPledges.photo,
  createdAt: materialPledges.createdAt,
  siteName: campaignSites.name,
  city: campaignSites.city,
};

function toDTO(row: Record<string, unknown>): PledgeAdminDTO {
  return {
    id: String(row.id),
    code: String(row.code),
    donorName: String(row.donorName),
    donorContact: String(row.donorContact ?? ""),
    items: Array.isArray(row.items) ? (row.items as PledgeAdminDTO["items"]) : [],
    status: String(row.status ?? "pledged"),
    siteName: row.siteName ? String(row.siteName) : null,
    city: row.city ? String(row.city) : null,
    publicAlias: row.publicAlias ? String(row.publicAlias) : null,
    note: String(row.note ?? ""),
    photo: row.photo ? String(row.photo) : null,
    createdAt: Number(row.createdAt ?? 0),
  };
}

export async function listPledges(): Promise<PledgeAdminDTO[]> {
  const db = await getDb();
  const rows = await db
    .select(columns)
    .from(materialPledges)
    .leftJoin(campaignSites, eq(campaignSites.id, materialPledges.siteId))
    .orderBy(desc(materialPledges.createdAt))
    .limit(500);
  return rows.map(toDTO);
}

export async function getPledge(id: string): Promise<PledgeAdminDTO | null> {
  const db = await getDb();
  const rows = await db
    .select(columns)
    .from(materialPledges)
    .leftJoin(campaignSites, eq(campaignSites.id, materialPledges.siteId))
    .where(eq(materialPledges.id, id))
    .limit(1);
  return rows[0] ? toDTO(rows[0]) : null;
}
