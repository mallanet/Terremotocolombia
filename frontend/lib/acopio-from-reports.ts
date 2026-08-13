import type { AcopioFacets, AcopioResponse, CollectionCenter } from "./acopio";

export const REPORT_CENTER_ID_PREFIX = "report:";

export interface ShelterReportLike {
  id: string;
  type: string;
  lat: number;
  lng: number;
  place: string;
  needs: string;
}

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

export function shelterReportToCenter(
  report: ShelterReportLike,
  country: string,
): CollectionCenter | null {
  if (report.type !== "shelter") return null;
  if (!Number.isFinite(report.lat) || !Number.isFinite(report.lng)) return null;
  const place = report.place.trim();
  const needs = report.needs.trim();
  return {
    id: `${REPORT_CENTER_ID_PREFIX}${report.id}`,
    name: place ? place.split("\n")[0]!.slice(0, 120) : "Centro de acopio",
    manager: null,
    address: place || null,
    city: null,
    country,
    lat: report.lat,
    lng: report.lng,
    accepts: ACCEPT_PATTERNS.filter(([, pattern]) => pattern.test(needs)).map(
      ([key]) => key,
    ),
    contact: null,
    schedule: null,
    status: "active",
    verificationLevel: "citizen",
    disputed: false,
    description: needs || null,
  };
}

export function extraMatchesFilters(
  center: CollectionCenter,
  filters: { country?: string; category?: string; q?: string },
): boolean {
  if (filters.country && center.country !== filters.country) return false;
  if (filters.category && !center.accepts.includes(filters.category)) return false;
  if (!filters.q) return true;
  const hay = [center.name, center.address, center.description, center.city]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("es");
  return hay.includes(filters.q.trim().toLocaleLowerCase("es"));
}

export function mergeShelterReports(
  acopio: AcopioResponse | undefined,
  reports: readonly ShelterReportLike[],
  country: string,
  filters: { country?: string; category?: string; q?: string } = {},
): AcopioResponse | undefined {
  if (!acopio) return acopio;
  const seen = new Set(acopio.items.map((item) => item.id));
  const extra: CollectionCenter[] = [];
  for (const report of reports) {
    const center = shelterReportToCenter(report, country);
    if (!center || seen.has(center.id)) continue;
    seen.add(center.id);
    extra.push(center);
  }
  if (extra.length === 0) return acopio;
  const matching = extra.filter((center) => extraMatchesFilters(center, filters));
  const items = [...acopio.items, ...matching];
  return {
    items,
    total: items.length,
    facets: addFacets(acopio.facets, extra),
  };
}

function addFacets(base: AcopioFacets, extra: CollectionCenter[]): AcopioFacets {
  const byCountry = { ...base.byCountry };
  const byCategory = { ...base.byCategory };
  for (const center of extra) {
    if (center.country) {
      byCountry[center.country] = (byCountry[center.country] ?? 0) + 1;
    }
    for (const category of center.accepts) {
      byCategory[category] = (byCategory[category] ?? 0) + 1;
    }
  }
  return { byCountry, byCategory };
}
