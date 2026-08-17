/**
 * Catálogo de materiales de la campaña de reconstrucción.
 *
 * Vive en código y no en una tabla a propósito: son ocho valores que cambian
 * con una decisión del equipo, no con una operación de usuario. Una tabla
 * obligaría a una migración para algo que hoy se resuelve con un PR, y a un
 * JOIN en cada agregado público.
 *
 * `unit` es la unidad en la que la gente cuenta ese material cuando lo dona
 * (sacos, no kilos; metros cúbicos, no toneladas). El frontend repite estas
 * etiquetas en frontend/lib/campaign-materials.ts — el mismo trato que ya
 * tienen las etiquetas de hospitales en frontend/lib/hospitals-meta.ts.
 */
export const CAMPAIGN_MATERIALS = {
  cemento: { label: "Cemento", unit: "sacos de 50 kg" },
  varilla: { label: "Varilla o hierro", unit: "unidades" },
  ladrillo: { label: "Ladrillo o bloque", unit: "unidades" },
  arena: { label: "Arena o gravilla", unit: "metros cúbicos" },
  teja: { label: "Teja o cubierta", unit: "unidades" },
  madera: { label: "Madera", unit: "unidades" },
  herramienta: { label: "Herramienta", unit: "unidades" },
  otro: { label: "Otro material", unit: "unidades" },
} as const;

export type MaterialKey = keyof typeof CAMPAIGN_MATERIALS;

export const MATERIAL_KEYS = Object.keys(CAMPAIGN_MATERIALS) as [MaterialKey, ...MaterialKey[]];

export function materialLabel(key: string): string {
  return CAMPAIGN_MATERIALS[key as MaterialKey]?.label ?? key;
}

export function materialUnit(key: string): string {
  return CAMPAIGN_MATERIALS[key as MaterialKey]?.unit ?? "unidades";
}
