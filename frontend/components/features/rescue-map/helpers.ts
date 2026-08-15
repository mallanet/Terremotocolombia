import {
  firstProduct,
  type RescueMapIncident,
  type RescueMapLanguage,
  type RescueMapMappingAoi,
  type RescueMapMappingSnapshot,
} from "@/lib/rescue-map";

// Shared props for every external anchor rendered by the rescue map UI:
// satellite sources, Copernicus/registry links, or vendor attributions.
export const externalLinkProps = {
  target: "_blank",
  rel: "noopener noreferrer",
} as const;

// Date formatter kept here so the experience, rail, and section components
// share a single timezone and locale choice. Returns "—" for null values so
// callers can feed nullable fields without guard clauses.
export function localizedDate(
  value: string | number | null,
  language: RescueMapLanguage,
): string {
  if (value === null) return "—";
  return new Intl.DateTimeFormat(language === "es" ? "es-CO" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date(value));
}

// Picks the freshest known timestamp across both feeds so the UI can show a
// single "updated" label without deciding which feed is canonical.
export function latestSourceTime(
  incident: RescueMapIncident,
  mapping: RescueMapMappingSnapshot,
): string {
  return incident.lastVerifiedAt > mapping.lastCheckedAt
    ? incident.lastVerifiedAt
    : mapping.lastCheckedAt;
}

// Thin wrapper around `firstProduct` that collapses the "no AOI selected"
// case to null instead of an undefined fallback.
export function selectedProduct(aoi: RescueMapMappingAoi | null) {
  return aoi ? firstProduct(aoi) : null;
}

// Bridges online/offline change events into a useSyncExternalStore contract.
export function subscribeToConnectivity(onStoreChange: () => void) {
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

// Same bridge for the breakpoint that toggles the mobile sheet on or off.
// The 767px cutoff matches `e-rescue-mobile-*` styles in rescue-map.css.
export function subscribeToMobileViewport(onStoreChange: () => void) {
  const media = window.matchMedia("(max-width: 767px)");
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}
