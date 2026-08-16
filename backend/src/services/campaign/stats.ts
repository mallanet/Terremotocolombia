/**
 * Agregados públicos de la campaña: lo comprometido, lo recibido y lo enviado.
 *
 * Las líneas de material viven en una columna jsonb, así que la suma se hace
 * en Postgres con jsonb_array_elements en vez de traerse todas las filas para
 * sumarlas en JS. Es una consulta por bloque, no una por punto, y el número de
 * filas que cruzan la red no crece con la campaña.
 *
 * Comprometido y recibido NUNCA se suman entre sí: son dos cifras distintas y
 * la página las enseña por separado.
 */
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { materialLabel, materialUnit } from "@/lib/campaign-materials";

export interface MaterialTotal {
  material: string;
  label: string;
  unitLabel: string;
  quantity: number;
}

export interface CityTotal {
  city: string;
  materials: MaterialTotal[];
}

export interface CampaignStats {
  updatedAt: number;
  received: MaterialTotal[];
  pledgedPending: MaterialTotal[];
  shipped: MaterialTotal[];
  cities: CityTotal[];
  confirmedDonations: number;
  donorWall: string[];
}

interface RawRow {
  city?: unknown;
  material?: unknown;
  qty?: unknown;
  total?: unknown;
  alias?: unknown;
}

/** node-postgres y el driver HTTP de Neon devuelven formas distintas; ambos traen `rows`. */
function rowsOf(result: unknown): RawRow[] {
  const withRows = result as { rows?: RawRow[] };
  if (Array.isArray(withRows?.rows)) return withRows.rows;
  return Array.isArray(result) ? (result as RawRow[]) : [];
}

function toTotal(row: RawRow): MaterialTotal {
  const material = String(row.material ?? "otro");
  return {
    material,
    label: materialLabel(material),
    unitLabel: materialUnit(material),
    quantity: Number(row.qty ?? 0),
  };
}

function byQuantityDesc(a: MaterialTotal, b: MaterialTotal): number {
  return b.quantity - a.quantity;
}

export async function getCampaignStats(campaign: string): Promise<CampaignStats> {
  const db = await getDb();

  const receivedByCity = rowsOf(
    await db.execute(sql`
      SELECT s.city AS city, item->>'material' AS material,
             SUM((item->>'quantity')::numeric) AS qty
        FROM material_receipts r
        JOIN campaign_sites s ON s.id = r.site_id
        CROSS JOIN LATERAL jsonb_array_elements(r.items) AS item
       WHERE s.campaign = ${campaign}
       GROUP BY 1, 2`),
  );

  const pledgedPending = rowsOf(
    await db.execute(sql`
      SELECT item->>'material' AS material, SUM((item->>'quantity')::numeric) AS qty
        FROM material_pledges p
        CROSS JOIN LATERAL jsonb_array_elements(p.items) AS item
       WHERE p.campaign = ${campaign} AND p.status = 'pledged'
       GROUP BY 1`),
  );

  const shipped = rowsOf(
    await db.execute(sql`
      SELECT item->>'material' AS material, SUM((item->>'quantity')::numeric) AS qty
        FROM material_shipments m
        CROSS JOIN LATERAL jsonb_array_elements(m.items) AS item
       WHERE m.campaign = ${campaign} AND m.status IN ('in_transit', 'delivered')
       GROUP BY 1`),
  );

  const confirmed = rowsOf(
    await db.execute(sql`
      SELECT COUNT(*)::int AS total
        FROM material_pledges
       WHERE campaign = ${campaign} AND status IN ('received', 'partial')`),
  );

  const wall = rowsOf(
    await db.execute(sql`
      SELECT public_alias AS alias
        FROM material_pledges
       WHERE campaign = ${campaign}
         AND status IN ('received', 'partial')
         AND public_alias IS NOT NULL AND public_alias <> ''
       ORDER BY updated_at DESC
       LIMIT 200`),
  );

  return {
    updatedAt: Date.now(),
    received: aggregate(receivedByCity),
    pledgedPending: pledgedPending.map(toTotal).sort(byQuantityDesc),
    shipped: shipped.map(toTotal).sort(byQuantityDesc),
    cities: groupByCity(receivedByCity),
    confirmedDonations: Number(confirmed[0]?.total ?? 0),
    donorWall: wall.map((row) => String(row.alias ?? "")).filter(Boolean),
  };
}

function aggregate(rows: RawRow[]): MaterialTotal[] {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const material = String(row.material ?? "otro");
    totals.set(material, (totals.get(material) ?? 0) + Number(row.qty ?? 0));
  }
  return [...totals]
    .map(([material, quantity]) => toTotal({ material, qty: quantity }))
    .sort(byQuantityDesc);
}

function groupByCity(rows: RawRow[]): CityTotal[] {
  const cities = new Map<string, RawRow[]>();
  for (const row of rows) {
    const city = String(row.city ?? "");
    cities.set(city, [...(cities.get(city) ?? []), row]);
  }
  return [...cities]
    .map(([city, cityRows]) => ({ city, materials: aggregate(cityRows) }))
    .sort((a, b) => a.city.localeCompare(b.city));
}
