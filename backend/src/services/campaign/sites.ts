/**
 * Puntos de recolección de la campaña.
 *
 * Tabla propia (campaign_sites) y no `hospitals` con facility_type="refugio":
 * un punto de acopio de cemento no comparte ni una columna útil con un lugar
 * donde hay personas alojadas, y mezclarlos volvería a cruzar el buscador de
 * personas con inventario de obra.
 */
import { and, asc, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { campaignSites, DEFAULT_CAMPAIGN } from "@/db/campaign-schema";

export interface PublicSite {
  id: string;
  name: string;
  city: string;
  address: string;
  lat: number | null;
  lng: number | null;
  schedule: string;
  contact: string;
  accepts: string[];
  status: string;
  note: string;
}

const publicColumns = {
  id: campaignSites.id,
  name: campaignSites.name,
  city: campaignSites.city,
  address: campaignSites.address,
  lat: campaignSites.lat,
  lng: campaignSites.lng,
  schedule: campaignSites.schedule,
  contact: campaignSites.publicContact,
  accepts: campaignSites.accepts,
  status: campaignSites.status,
  note: campaignSites.note,
};

/**
 * Puntos visibles al público. Los cerrados no se listan; los pausados y los
 * llenos SÍ, porque una persona que va a salir de casa con un bulto de cemento
 * necesita saber que ese punto no lo puede recibir hoy.
 */
export async function listSites(campaign: string = DEFAULT_CAMPAIGN): Promise<PublicSite[]> {
  const db = await getDb();
  const rows = await db
    .select(publicColumns)
    .from(campaignSites)
    .where(and(eq(campaignSites.campaign, campaign), ne(campaignSites.status, "closed")))
    .orderBy(asc(campaignSites.city), asc(campaignSites.name));
  return rows.map(toPublicSite);
}

export async function getSite(id: string): Promise<PublicSite | null> {
  const db = await getDb();
  const rows = await db.select(publicColumns).from(campaignSites).where(eq(campaignSites.id, id)).limit(1);
  const row = rows[0];
  return row ? toPublicSite(row) : null;
}

export async function siteAcceptsMaterial(siteId: string, material: string): Promise<boolean> {
  const site = await getSite(siteId);
  if (!site) return false;
  return site.accepts.length === 0 || site.accepts.includes(material);
}

function toPublicSite(row: Record<string, unknown>): PublicSite {
  return {
    id: String(row.id),
    name: String(row.name),
    city: String(row.city),
    address: String(row.address ?? ""),
    lat: row.lat === null || row.lat === undefined ? null : Number(row.lat),
    lng: row.lng === null || row.lng === undefined ? null : Number(row.lng),
    schedule: String(row.schedule ?? ""),
    contact: String(row.contact ?? ""),
    accepts: Array.isArray(row.accepts) ? (row.accepts as string[]) : [],
    status: String(row.status ?? "active"),
    note: String(row.note ?? ""),
  };
}
