/**
 * Etiquetas de los materiales de la campaña de reconstrucción.
 *
 * Espeja backend/src/lib/campaign-materials.ts, igual que
 * frontend/lib/hospitals-meta.ts espeja los tipos de centro. Si aquí falta una
 * clave, la interfaz muestra la clave cruda en vez de romperse.
 */
export const CAMPAIGN_MATERIALS = {
  cemento: { label: "Cemento", unit: "sacos de 50 kg", emoji: "🧱" },
  varilla: { label: "Varilla o hierro", unit: "unidades", emoji: "🏗️" },
  ladrillo: { label: "Ladrillo o bloque", unit: "unidades", emoji: "🧱" },
  arena: { label: "Arena o gravilla", unit: "metros cúbicos", emoji: "⛏️" },
  teja: { label: "Teja o cubierta", unit: "unidades", emoji: "🏠" },
  madera: { label: "Madera", unit: "unidades", emoji: "🪵" },
  herramienta: { label: "Herramienta", unit: "unidades", emoji: "🔧" },
  otro: { label: "Otro material", unit: "unidades", emoji: "📦" },
} as const;

export type MaterialKey = keyof typeof CAMPAIGN_MATERIALS;

export const MATERIAL_KEYS = Object.keys(CAMPAIGN_MATERIALS) as MaterialKey[];

export function materialLabel(key: string): string {
  return CAMPAIGN_MATERIALS[key as MaterialKey]?.label ?? key;
}

export function materialUnit(key: string): string {
  return CAMPAIGN_MATERIALS[key as MaterialKey]?.unit ?? "unidades";
}

export function materialEmoji(key: string): string {
  return CAMPAIGN_MATERIALS[key as MaterialKey]?.emoji ?? "📦";
}

export const SITE_STATUS_LABELS: Record<string, string> = {
  active: "Abierto",
  paused: "Pausado",
  full: "Sin espacio hoy",
  closed: "Cerrado",
};

export interface CampaignSite {
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

export interface MaterialTotal {
  material: string;
  label: string;
  unitLabel: string;
  quantity: number;
}

export interface CampaignBalance {
  updatedAt: number;
  received: MaterialTotal[];
  pledgedPending: MaterialTotal[];
  shipped: MaterialTotal[];
  cities: Array<{ city: string; materials: MaterialTotal[] }>;
  confirmedDonations: number;
  donorWall: string[];
}

export interface CampaignCertificate {
  code: string;
  status: string;
  alias: string | null;
  items: Array<{ material: string; quantity: number; unit: string; label: string; unitLabel: string }>;
  createdAt: number;
  confirmedAt: number | null;
  siteId: string | null;
}
