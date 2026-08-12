"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { SITE_PRODUCT_NAME } from "@/lib/site";
import {
  firstProduct,
  isRescueMapIncident,
  isRescueMapMappingSnapshot,
  type RescueMapIncident,
  type RescueMapLanguage,
  type RescueMapMappingAoi,
  type RescueMapMappingSnapshot,
  type RescueMapMode,
} from "@/lib/rescue-map";
import {
  loadRescueSnapshot,
  saveRescueSnapshot,
} from "@/lib/rescue-map-offline";
import InstallRescueMap from "./InstallRescueMap";
import OfflinePackages from "./OfflinePackages";

const INCIDENT_PATH =
  "/data/incidents/colombia-2026-08-10-san-jose-del-palmar.json";
const MAPPING_PATH = "/data/incidents/colombia-2026-08-10-emsr916-map.json";
const VIEW_STATE_KEY = "terremoto-colombia:rescue-map-view:v1";
const OFFLINE_REFRESH_INTERVAL_MS = 5_000;

const RescueMapCanvas = dynamic(() => import("./RescueMapCanvas"), {
  ssr: false,
  loading: () => (
    <div className="e-rescue-map-loading" role="status">
      Cargando mapa / <span lang="en">Loading map</span>
    </div>
  ),
});

const externalLinkProps = {
  target: "_blank",
  rel: "noopener noreferrer",
} as const;

const copy = {
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

function localizedDate(
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

function latestSourceTime(
  incident: RescueMapIncident,
  mapping: RescueMapMappingSnapshot,
): string {
  return incident.lastVerifiedAt > mapping.lastCheckedAt
    ? incident.lastVerifiedAt
    : mapping.lastCheckedAt;
}

function selectedProduct(aoi: RescueMapMappingAoi | null) {
  return aoi ? firstProduct(aoi) : null;
}

function comparisonStateLabel(
  state: RescueMapMappingSnapshot["imagery"]["comparisonState"],
  language: RescueMapLanguage,
): string {
  const text = copy[language];
  switch (state) {
    case "scheduled":
      return text.comparisonScheduled;
    case "partial":
      return text.comparisonPartial;
    case "ready":
      return text.comparisonReady;
    default:
      return text.comparisonUnknown;
  }
}

function subscribeToConnectivity(onStoreChange: () => void) {
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
}

export default function RescueMapExperience({
  initialIncident,
  initialMapping,
}: {
  initialIncident: RescueMapIncident;
  initialMapping: RescueMapMappingSnapshot;
}) {
  // El selector global del header traduce la página completa. Mantener una
  // segunda preferencia local produciría combinaciones inconsistentes.
  const language = "es" satisfies RescueMapLanguage;
  const [mode, setMode] = useState<RescueMapMode>("reference");
  const [incident, setIncident] = useState(initialIncident);
  const [mapping, setMapping] = useState(initialMapping);
  const [selectedAoiId, setSelectedAoiId] = useState<string | null>(null);
  const isOnline = useSyncExternalStore(
    subscribeToConnectivity,
    () => navigator.onLine,
    () => true,
  );
  const [usingCachedData, setUsingCachedData] = useState(false);
  const [lastLocalUpdate, setLastLocalUpdate] = useState<number>(
    Date.parse(latestSourceTime(initialIncident, initialMapping)),
  );
  const [updateNotice, setUpdateNotice] = useState(false);
  const [viewStateLoaded, setViewStateLoaded] = useState(false);
  const sourceUpdatedRef = useRef(
    latestSourceTime(initialIncident, initialMapping),
  );
  const text = copy[language];

  const selectedAoi = useMemo(
    () => mapping.aois.find((aoi) => aoi.id === selectedAoiId) ?? null,
    [mapping.aois, selectedAoiId],
  );
  const product = selectedProduct(selectedAoi);
  const image = product?.images[0] ?? null;

  useEffect(() => {
    sourceUpdatedRef.current = latestSourceTime(incident, mapping);
  }, [incident, mapping]);

  useEffect(() => {
    const restoreViewState = () => {
      try {
        const raw = window.localStorage.getItem(VIEW_STATE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as {
            mode?: unknown;
            selectedAoiId?: unknown;
          };
          if (
            saved.mode === "map" ||
            saved.mode === "reference" ||
            (saved.mode === "before" && initialMapping.imagery.before) ||
            (saved.mode === "after" && initialMapping.imagery.after)
          ) {
            setMode(saved.mode);
          }
          if (
            typeof saved.selectedAoiId === "string" &&
            initialMapping.aois.some((aoi) => aoi.id === saved.selectedAoiId)
          ) {
            setSelectedAoiId(saved.selectedAoiId);
          }
        }
      } catch {
        // Estado opcional: un valor corrupto no bloquea el mapa.
      } finally {
        setViewStateLoaded(true);
      }
    };
    const restoreTimer = window.setTimeout(restoreViewState, 0);
    return () => window.clearTimeout(restoreTimer);
  }, [initialMapping]);

  useEffect(() => {
    if (!viewStateLoaded) return;
    try {
      window.localStorage.setItem(
        VIEW_STATE_KEY,
        JSON.stringify({ mode, selectedAoiId }),
      );
    } catch {
      // El mapa sigue funcional si el navegador bloquea localStorage.
    }
  }, [mode, selectedAoiId, viewStateLoaded]);

  const refreshStaticData = useCallback(async (announce: boolean) => {
    try {
      // Son assets JSON públicos del mismo origen, no una llamada a la API.
      const [incidentResponse, mappingResponse] = await Promise.all([
        fetch(INCIDENT_PATH, { cache: "no-store" }),
        fetch(MAPPING_PATH, { cache: "no-store" }),
      ]);
      if (!incidentResponse.ok || !mappingResponse.ok) return;
      const [incidentJson, mappingJson] = await Promise.all([
        incidentResponse.json() as Promise<unknown>,
        mappingResponse.json() as Promise<unknown>,
      ]);
      if (
        !isRescueMapIncident(incidentJson) ||
        !isRescueMapMappingSnapshot(mappingJson)
      ) {
        return;
      }

      const mappingWithStale = mappingJson as RescueMapMappingSnapshot & {
        __swStaleAt?: unknown;
      };
      const staleAt =
        typeof mappingWithStale.__swStaleAt === "number"
          ? mappingWithStale.__swStaleAt
          : null;
      const nextSourceUpdated = latestSourceTime(incidentJson, mappingJson);
      const hasNewInformation = nextSourceUpdated > sourceUpdatedRef.current;
      setIncident(incidentJson);
      setMapping(mappingJson);
      setUsingCachedData(staleAt !== null);
      setLastLocalUpdate(staleAt ?? Date.now());
      if (hasNewInformation && announce) setUpdateNotice(true);
      sourceUpdatedRef.current = nextSourceUpdated;
      if (staleAt === null) {
        await saveRescueSnapshot(incidentJson, mappingJson);
      }
    } catch {
      // La vista conserva el snapshot inicial o el último guardado.
    }
  }, []);

  useEffect(() => {
    let active = true;
    const online = navigator.onLine;

    loadRescueSnapshot()
      .then((snapshot) => {
        if (!active || !snapshot) return;
        if (snapshot.sourceUpdatedAt > sourceUpdatedRef.current) {
          setIncident(snapshot.incident);
          setMapping(snapshot.mapping);
          sourceUpdatedRef.current = snapshot.sourceUpdatedAt;
        }
        setLastLocalUpdate(snapshot.savedAt);
      })
      .catch(() => {});

    const refreshTimer = online
      ? window.setTimeout(() => void refreshStaticData(false), 0)
      : null;

    const onOnline = () => {
      void refreshStaticData(true);
    };
    const onOffline = () => {
      setUsingCachedData(true);
    };
    const onServiceWorkerMessage = (event: MessageEvent<unknown>) => {
      if (
        typeof event.data === "object" &&
        event.data !== null &&
        "type" in event.data &&
        event.data.type === "rescue-map-data-updated"
      ) {
        void refreshStaticData(true);
      }
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    navigator.serviceWorker?.addEventListener("message", onServiceWorkerMessage);
    return () => {
      active = false;
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      navigator.serviceWorker?.removeEventListener(
        "message",
        onServiceWorkerMessage,
      );
    };
  }, [refreshStaticData]);

  useEffect(() => {
    if (!usingCachedData) return;
    const retryTimer = window.setInterval(
      () => void refreshStaticData(true),
      OFFLINE_REFRESH_INTERVAL_MS,
    );
    return () => window.clearInterval(retryTimer);
  }, [refreshStaticData, usingCachedData]);

  const modes: Array<{
    id: RescueMapMode;
    label: string;
    available: boolean;
  }> = [
    { id: "map", label: text.map, available: true },
    { id: "reference", label: text.reference, available: true },
    { id: "before", label: text.before, available: Boolean(mapping.imagery.before) },
    { id: "after", label: text.after, available: Boolean(mapping.imagery.after) },
  ];

  const prioritySourceIds = new Set([
    "copernicus-emsr916",
    "sgc-seismic-viewer",
    "dimar-bulletin-01",
    "ungrd-initial-response",
  ]);
  const prioritySources = incident.sources.filter((source) =>
    prioritySourceIds.has(source.id),
  );
  // En una reapertura controlada por el service worker Chromium puede marcar
  // `navigator.onLine` como true porque la navegación respondió desde caché.
  // La marca añadida por el network-first de los JSON es la señal fiable:
  // si llegó una copia stale, la fuente operativa no fue alcanzable.
  const effectivelyOffline = !isOnline || usingCachedData;
  const connectionLabel = effectivelyOffline
    ? text.offline
    : usingCachedData
      ? text.cached
      : text.online;
  const imageNeedsConnection = effectivelyOffline;
  const currentProvider =
    mode === "reference"
      ? text.referenceSource
      : mode === "map"
        ? text.mapSource
        : mode === "before"
          ? text.before
          : text.after;

  return (
    <main
      id="main"
      className="e-rescue-page"
      data-incident-id={incident.incidentId}
      data-status={incident.status}
      data-map-activation={mapping.activationCode}
    >
      <a className="e-rescue-skip" href="#mapa-de-rescate-canvas">
        {text.skip}
      </a>

      <section className="e-rescue-map-stage" aria-label={text.currentView}>
        <ErrorBoundary
          fallback={
            <div
              id="mapa-de-rescate-canvas"
              className="e-rescue-map-loading"
              role="region"
              aria-label={text.mapFailure}
              tabIndex={0}
            >
              {text.mapFailure}
            </div>
          }
        >
          <RescueMapCanvas
            mapping={mapping}
            mode={mode}
            language={language}
            selectedAoiId={selectedAoiId}
            epicenter={{
              longitude: incident.event.longitude,
              latitude: incident.event.latitude,
              magnitude: incident.event.magnitude,
            }}
            isOnline={!effectivelyOffline}
            onSelectAoi={setSelectedAoiId}
          />
        </ErrorBoundary>

        <div
          className="e-rescue-map-status"
          data-online={String(!effectivelyOffline)}
          aria-live="polite"
          aria-atomic="true"
        >
          <span>
            {imageNeedsConnection ? text.imageryOffline : text.currentView}
          </span>
          <strong>
            {selectedAoi ? selectedAoi.name[language] : text.overview}
          </strong>
          <small>
            {currentProvider} · {connectionLabel}
          </small>
        </div>

        <div
          className="e-rescue-map-legend"
          aria-label={language === "es" ? "Leyenda del mapa" : "Map legend"}
        >
          <span>
            <i className="e-rescue-key" data-kind="epicenter" aria-hidden />
            {text.legendEpicenter}
          </span>
          <span>
            <i className="e-rescue-key" data-kind="damage" aria-hidden />
            {text.legendDamage}
          </span>
          <span>
            <i className="e-rescue-key" data-kind="movement" aria-hidden />
            {text.legendMovement}
          </span>
        </div>

        <p className="e-rescue-attribution">
          {mode === "map" ? (
            <>
              ©{" "}
              <a
                href="https://www.openstreetmap.org/copyright"
                {...externalLinkProps}
              >
                OpenStreetMap
              </a>{" "}
              contributors
            </>
          ) : (
            <>
              Tiles © Esri, Maxar, Earthstar Geographics and the GIS User
              Community
            </>
          )}
          {" · "}
          <a href="https://leafletjs.com/" {...externalLinkProps}>
            Leaflet
          </a>
        </p>
      </section>

      <aside
        className="e-rescue-rail"
        aria-label={
          language === "es" ? "Panel operacional del incidente" : "Incident operations panel"
        }
      >
        <header className="e-rescue-rail-header">
          <div className="e-rescue-rail-top">
            <div className="e-rescue-identity">
              <span className="e-rescue-identity-mark" aria-hidden>
                +
              </span>
              <p>{SITE_PRODUCT_NAME}</p>
              <span className="e-rescue-activation">
                {mapping.activationCode}
              </span>
            </div>
          </div>
          <h1>{text.title}</h1>
          <p className="e-rescue-event-title">
            {incident.event.title[language]}
          </p>
          <div
            className="e-rescue-status-line"
            data-online={String(!effectivelyOffline)}
          >
            <span className="e-rescue-status-dot" aria-hidden />
            <strong>{connectionLabel}</strong>
            <span>
              {text.localUpdate}:{" "}
              <time dateTime={new Date(lastLocalUpdate).toISOString()}>
                {localizedDate(lastLocalUpdate, language)}
              </time>
            </span>
          </div>
          <div className="e-rescue-status-line">
            <strong>{text.verified}</strong>
            <time dateTime={mapping.lastCheckedAt}>
              {localizedDate(mapping.lastCheckedAt, language)}
            </time>
          </div>
          {updateNotice ? (
            <p
              className="e-rescue-package-message"
              role="status"
              aria-live="polite"
            >
              {text.newData}
            </p>
          ) : null}
        </header>

        <section
          className="e-rescue-facts"
          aria-label={language === "es" ? "Datos del evento" : "Event facts"}
        >
          <div className="e-rescue-fact">
            <span>{text.magnitude}</span>
            <strong>M{incident.event.magnitude}</strong>
          </div>
          <div className="e-rescue-fact">
            <span>{text.depth}</span>
            <strong>{incident.event.depthKm} km</strong>
          </div>
          <div className="e-rescue-fact">
            <span>{text.mapAreas}</span>
            <strong>{mapping.aois.length} AOI</strong>
          </div>
        </section>

        <section className="e-rescue-section" aria-labelledby="rescue-map-modes">
          <div className="e-rescue-section-heading">
            <h2 id="rescue-map-modes">{text.mapModes}</h2>
            <span className="e-rescue-section-status">
              {comparisonStateLabel(
                mapping.imagery.comparisonState,
                language,
              )}
            </span>
          </div>
          <div
            className="e-rescue-mode-control"
            role="group"
            aria-label={text.mapModes}
          >
            {modes.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                aria-pressed={mode === item.id}
                disabled={!item.available}
                aria-describedby={!item.available ? "rescue-comparison-waiting" : undefined}
                title={!item.available ? text.unavailable : undefined}
                onClick={() => setMode(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div
            id="rescue-comparison-waiting"
            className="e-rescue-notice"
            data-tone={imageNeedsConnection ? "offline" : "reference"}
            role="status"
          >
            <strong>
              {imageNeedsConnection
                ? text.imageryOffline
                : mode === "reference"
                  ? text.referenceWarning
                  : mode === "map"
                    ? text.mapSource
                    : text.scheduled}
            </strong>
            <p>
              {imageNeedsConnection
                ? text.imageryOfflineDetail
                : mode === "reference"
                  ? text.referenceDetail
                  : mode === "map"
                    ? text.mapDetail
                    : text.waitingSummary}
            </p>
          </div>
        </section>

        <section className="e-rescue-section" aria-labelledby="rescue-aoi-heading">
          <div className="e-rescue-section-heading">
            <h2 id="rescue-aoi-heading">{text.areas}</h2>
            <button
              type="button"
              className="e-rescue-overview"
              onClick={() => setSelectedAoiId(null)}
            >
              {text.overview}
            </button>
          </div>
          <p className="e-rescue-boundary-warning">
            {text.areaBoundaryWarning}
          </p>
          <div className="e-rescue-aoi-list">
            {mapping.aois.map((aoi) => {
              const aoiProduct = firstProduct(aoi);
              return (
                <button
                  key={aoi.id}
                  type="button"
                  className="e-rescue-aoi"
                  aria-pressed={aoi.id === selectedAoiId}
                  onClick={() => setSelectedAoiId(aoi.id)}
                  data-testid={`rescue-aoi-${String(aoi.number).padStart(2, "0")}`}
                >
                  <span className="e-rescue-aoi-code">
                    AOI {String(aoi.number).padStart(2, "0")} ·{" "}
                    {aoiProduct?.type ?? "—"}
                  </span>
                  <strong>{aoi.name[language]}</strong>
                  <small>
                    {aoiProduct?.typeLabel[language]} · {text.waiting}
                  </small>
                </button>
              );
            })}
          </div>
        </section>

        {selectedAoi && product ? (
          <section
            className="e-rescue-selection"
            aria-labelledby="rescue-selected-aoi"
          >
            <p>{text.selectedArea}</p>
            <h2 id="rescue-selected-aoi">{selectedAoi.name[language]}</h2>
            <dl>
              <div>
                <dt>{text.product}</dt>
                <dd>
                  <span
                    className="e-rescue-type"
                    data-product={product.type}
                  >
                    {product.type} · {product.typeLabel[language]}
                  </span>
                </dd>
              </div>
              <div>
                <dt>{text.sensor}</dt>
                <dd>
                  {image ? `${image.sensor} · ${image.resolutionClass}` : "—"}
                </dd>
              </div>
              <div>
                <dt>{text.acquisition}</dt>
                <dd>{localizedDate(image?.acquisitionUtc ?? null, language)}</dd>
              </div>
              <div>
                <dt>{text.delivery}</dt>
                <dd>{localizedDate(product.expectedDeliveryUtc, language)}</dd>
              </div>
            </dl>
          </section>
        ) : null}

        <section
          className="e-rescue-section"
          aria-labelledby="rescue-future-layers"
        >
          <div className="e-rescue-section-heading">
            <h2 id="rescue-future-layers">{text.futureLayers}</h2>
          </div>
          <div className="e-rescue-layers">
            <div className="e-rescue-layer-row">
              <strong>{text.needLayer}</strong>
              <span>{text.noNeeds}</span>
            </div>
            <div className="e-rescue-layer-row">
              <strong>{text.resourceLayer}</strong>
              <span>{text.noResources}</span>
            </div>
          </div>
          <p className="e-rescue-empty-copy">{text.futureLayerNote}</p>
        </section>

        <details className="e-rescue-details">
          <summary>{text.sources}</summary>
          <div className="e-rescue-details-body">
            <h2>{text.sourceTitle}</h2>
            <p className="e-rescue-package-copy">{text.sourceNote}</p>
            <ul className="e-rescue-source-list">
              <li>
                <a href={mapping.situationUrl} {...externalLinkProps}>
                  Copernicus EMSR916 <span aria-hidden>↗</span>
                </a>
              </li>
              {prioritySources.map((source) => (
                <li key={source.id}>
                  <a href={source.url} {...externalLinkProps}>
                    {source.label[language]} <span aria-hidden>↗</span>
                  </a>
                </li>
              ))}
            </ul>
            <div className="e-rescue-data-links">
              <a href={INCIDENT_PATH}>{text.registry}</a>
              <a href={MAPPING_PATH}>{text.mapping}</a>
            </div>
          </div>
        </details>

        <details className="e-rescue-details">
          <summary>{text.offlineTools}</summary>
          <div className="e-rescue-details-body">
            <InstallRescueMap language={language} />
            <h3>{text.data}</h3>
            <OfflinePackages
              incident={incident}
              mapping={mapping}
              language={language}
            />
          </div>
        </details>
      </aside>
    </main>
  );
}
