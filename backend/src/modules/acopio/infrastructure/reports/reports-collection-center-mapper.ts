import type { CollectionCenter } from "../../domain/collection-center";

export const REPORT_CENTER_ID_PREFIX = "report:";

const ACCEPT_PATTERNS: readonly (readonly [string, RegExp])[] = [
  ["food", /alimento|v[ií]veres|comida|pereceder/i],
  ["water", /\bagua\b/i],
  ["medicines", /medicin|medicament/i],
  ["medical_supplies", /insumo m[eé]dico|gasas?|jering|cat[eé]ter/i],
  ["clothing", /\bropa\b|calzado|zapat/i],
  ["hygiene", /\baseo\b|higiene|pa[nñ]al|jab[oó]n/i],
  ["blankets", /cobija|colchoneta|manta|s[aá]bana/i],
  ["tools", /herramient|casco|pala|guantes de construcci/i],
  ["blood", /\bsangre\b/i],
  ["shelter", /\brefugio\b/i],
];

export interface ShelterReportInput {
  readonly id: string;
  readonly type: string;
  readonly lat: number;
  readonly lng: number;
  readonly place: string;
  readonly needs: string;
}

export function isShelterReport(report: ShelterReportInput): boolean {
  return report.type === "shelter" && Number.isFinite(report.lat) && Number.isFinite(report.lng);
}

export function toCollectionCenterFromReport(
  report: ShelterReportInput,
  country: string,
): CollectionCenter {
  const place = report.place.trim();
  const needs = report.needs.trim();
  return {
    id: `${REPORT_CENTER_ID_PREFIX}${report.id}`,
    name: place ? place.split("\n")[0]!.slice(0, 120) : "Centro de acopio",
    manager: null,
    location: {
      address: place || null,
      latitude: report.lat,
      longitude: report.lng,
    },
    city: null,
    country,
    accepts: inferAccepts(needs),
    contact: null,
    schedule: null,
    status: "active",
    verificationLevel: "citizen",
    disputed: false,
    description: needs || null,
  };
}

function inferAccepts(text: string): string[] {
  if (!text) return [];
  return ACCEPT_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([key]) => key);
}
