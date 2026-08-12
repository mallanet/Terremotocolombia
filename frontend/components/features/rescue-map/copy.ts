import type { RescueMapLanguage } from "@/lib/rescue-map";

// Localized copy for the rescue map experience. The Spanish strings are the
// default; English mirrors 1:1. Both languages are kept in one object so a
// future refactor can extract them to a translation pipeline without
// re-plumbing every section component.
export const rescueMapCopy = {
  es: {
    skip: "Ir al mapa",
    title: "Mapa de rescate",
    online: "En línea",
    offline: "Sin conexión",
    cached: "Datos guardados",
    verified: "Verificación oficial",
    localUpdate: "Copia local",
    newData: "Se incorporó información nueva sin perder tu vista actual.",
    mapModes: "Base del mapa",
    compareImages: "Comparar imágenes",
    eventDetails: "Detalles del sismo",
    legend: "Leyenda",
    attribution: "Atribución del mapa",
    expandPanel: "Abrir panel operacional",
    collapsePanel: "Minimizar panel operacional",
    officialAreas: "4 áreas oficiales",
    map: "Mapa",
    reference: "Referencia",
    before: "Antes",
    after: "Después",
    unavailable: "Aún no disponible",
    referenceWarning: "Referencia visual · fecha de captura no verificada",
    referenceDetail:
      "Sirve para orientarse. No es una imagen anterior ni posterior al sismo y no demuestra daños.",
    mapDetail:
      "Contexto cartográfico de OpenStreetMap. Los datos operativos se muestran como capas separadas.",
    imageryOffline: "Esta imagen requiere conexión",
    imageryOfflineDetail:
      "El epicentro, las AOI y los metadatos descargados siguen disponibles sin red.",
    scheduled: "Adquisición programada",
    comparisonScheduled: "Imágenes pendientes",
    comparisonPartial: "Cobertura parcial",
    comparisonReady: "Comparación disponible",
    comparisonUnknown: "Estado por verificar",
    waitingSummary:
      "Antes y Después se activarán solo cuando exista cobertura fechada, licenciada y verificable.",
    areas: "Áreas oficiales de cartografía",
    areaBoundaryWarning:
      "Estas huellas son áreas de producción cartográfica de Copernicus; no son límites confirmados de daños.",
    overview: "Volver a las 4 áreas",
    selectedArea: "Área seleccionada",
    product: "Producto",
    sensor: "Sensor",
    acquisition: "Adquisición programada",
    delivery: "Entrega estimada",
    waiting: "En espera",
    mapAreas: "Áreas Copernicus",
    magnitude: "Magnitud",
    depth: "Profundidad",
    futureLayers: "Capas operativas",
    needLayer: "Necesidades",
    resourceLayer: "Recursos / voluntarios",
    noNeeds: "Sin necesidades verificadas publicadas.",
    noResources: "Sin disponibilidad agregada publicada.",
    futureLayerNote:
      "Estas capas están preparadas para datos verificados y anonimizados. No hay despacho automático.",
    sources: "Fuentes y método",
    sourceTitle: "Cómo leer este mapa",
    sourceNote:
      "Se separan la referencia visual, la adquisición programada, la imagen publicada y la evaluación oficial. La ausencia de una capa no significa ausencia de daños.",
    data: "Datos estáticos",
    registry: "Registro del evento",
    mapping: "Instantánea EMSR916",
    offlineTools: "Instalación y modo offline",
    currentView: "Vista actual",
    legendEpicenter: "Epicentro M7.4",
    legendDamage: "GRA · evaluación de daños",
    legendMovement: "GRM · movimiento del terreno",
    mapFailure:
      "El mapa visual no pudo cargarse. Las cuatro áreas y sus detalles siguen disponibles en el panel.",
    mapSource: "OpenStreetMap",
    referenceSource: "Esri World Imagery",
  },
  en: {
    skip: "Go to map",
    title: "Rescue map",
    online: "Online",
    offline: "Offline",
    cached: "Saved data",
    verified: "Official verification",
    localUpdate: "Local copy",
    newData: "New information was loaded without losing your current view.",
    mapModes: "Map base",
    compareImages: "Compare imagery",
    eventDetails: "Earthquake details",
    legend: "Legend",
    attribution: "Map attribution",
    expandPanel: "Open operations panel",
    collapsePanel: "Minimize operations panel",
    officialAreas: "4 official areas",
    map: "Map",
    reference: "Reference",
    before: "Before",
    after: "After",
    unavailable: "Not available yet",
    referenceWarning: "Visual reference · capture date unverified",
    referenceDetail:
      "This supports orientation. It is not pre- or post-event imagery and does not establish damage.",
    mapDetail:
      "OpenStreetMap geographic context. Operational data is displayed in separate layers.",
    imageryOffline: "This image requires a connection",
    imageryOfflineDetail:
      "The epicenter, AOIs, and downloaded metadata remain available offline.",
    scheduled: "Acquisition scheduled",
    comparisonScheduled: "Imagery pending",
    comparisonPartial: "Partial coverage",
    comparisonReady: "Comparison available",
    comparisonUnknown: "Status to verify",
    waitingSummary:
      "Before and After will activate only when dated, licensed, verifiable coverage is available.",
    areas: "Official mapping areas",
    areaBoundaryWarning:
      "These footprints are Copernicus map-production areas; they are not confirmed damage boundaries.",
    overview: "Return to all 4 areas",
    selectedArea: "Selected area",
    product: "Product",
    sensor: "Sensor",
    acquisition: "Scheduled acquisition",
    delivery: "Expected delivery",
    waiting: "Waiting",
    mapAreas: "Copernicus areas",
    magnitude: "Magnitude",
    depth: "Depth",
    futureLayers: "Operational layers",
    needLayer: "Needs",
    resourceLayer: "Resources / volunteers",
    noNeeds: "No verified needs have been published.",
    noResources: "No aggregated availability has been published.",
    futureLayerNote:
      "These layers are prepared for verified, anonymized data. There is no automatic dispatch.",
    sources: "Sources and method",
    sourceTitle: "How to read this map",
    sourceNote:
      "Visual reference, scheduled acquisition, published imagery, and official assessment remain separate. The absence of a layer does not mean an absence of damage.",
    data: "Static data",
    registry: "Event registry",
    mapping: "EMSR916 snapshot",
    offlineTools: "Installation and offline mode",
    currentView: "Current view",
    legendEpicenter: "M7.4 epicenter",
    legendDamage: "GRA · damage assessment",
    legendMovement: "GRM · ground movement",
    mapFailure:
      "The visual map could not load. All four areas and their details remain available in the panel.",
    mapSource: "OpenStreetMap",
    referenceSource: "Esri World Imagery",
  },
} as const;

export type RescueMapCopy = (typeof rescueMapCopy)[RescueMapLanguage];

// Section components only receive the slice of copy they need; everything is
// resolved against the same object so a new language only requires adding a
// key here.
export function getRescueMapCopy(language: RescueMapLanguage): RescueMapCopy {
  return rescueMapCopy[language];
}
