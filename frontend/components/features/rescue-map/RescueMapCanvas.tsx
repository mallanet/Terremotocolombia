"use client";

import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Pane,
  Polygon,
  Popup,
  Polyline,
  Rectangle,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
} from "react-leaflet";
import {
  firstProduct,
  parsePolygonWkt,
  type RescueMapLanguage,
  type RescueMapMappingSnapshot,
  type RescueMapMode,
} from "@/lib/rescue-map";

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function fitOptions(selected: boolean): L.FitBoundsOptions {
  const mobile = window.matchMedia("(max-width: 767px)").matches;
  if (mobile) {
    return {
      paddingTopLeft: [24, 24],
      paddingBottomRight: [24, Math.min(window.innerHeight * 0.46, 430)],
      maxZoom: selected ? 15 : 8,
      animate: !reducedMotion(),
      duration: reducedMotion() ? 0 : 0.35,
    };
  }
  return {
    paddingTopLeft: [410, 64],
    paddingBottomRight: [64, 64],
    maxZoom: selected ? 15 : 8,
    animate: !reducedMotion(),
    duration: reducedMotion() ? 0 : 0.35,
  };
}

function RescueMapCamera({
  mapping,
  selectedAoiId,
}: {
  mapping: RescueMapMappingSnapshot;
  selectedAoiId: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    const selected = mapping.aois.find((aoi) => aoi.id === selectedAoiId);
    const wkt = selected?.extentWkt ?? mapping.extentWkt;
    const [ring] = parsePolygonWkt(wkt);
    if (!ring?.length) return;

    const fit = () => {
      map.invalidateSize({ pan: false });
      map.fitBounds(L.latLngBounds(ring), fitOptions(Boolean(selected)));
    };
    const frame = requestAnimationFrame(fit);
    window.addEventListener("orientationchange", fit);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("orientationchange", fit);
    };
  }, [map, mapping, selectedAoiId]);

  return null;
}

function OfflineReferenceGrid({
  mapping,
  visible,
}: {
  mapping: RescueMapMappingSnapshot;
  visible: boolean;
}) {
  const [ring] = useMemo(
    () => parsePolygonWkt(mapping.extentWkt),
    [mapping.extentWkt],
  );
  if (!visible || !ring?.length) return null;

  const lats = ring.map(([lat]) => lat);
  const lngs = ring.map(([, lng]) => lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const fractions = [0.25, 0.5, 0.75];

  return (
    <Pane name="rescue-offline-grid" style={{ zIndex: 150 }}>
      <Rectangle
        bounds={[
          [minLat, minLng],
          [maxLat, maxLng],
        ]}
        pathOptions={{
          color: "#0f2154",
          dashArray: "5 6",
          fillColor: "#e1eaff",
          fillOpacity: 0.16,
          opacity: 0.35,
          weight: 1,
        }}
        interactive={false}
      />
      {fractions.map((fraction) => {
        const lat = minLat + (maxLat - minLat) * fraction;
        const lng = minLng + (maxLng - minLng) * fraction;
        return (
          <Pane
            key={fraction}
            name={`rescue-offline-grid-${fraction}`}
            style={{ zIndex: 151 }}
          >
            <Polyline
              positions={[
                [lat, minLng],
                [lat, maxLng],
              ]}
              pathOptions={{ color: "#0f2154", opacity: 0.16, weight: 1 }}
              interactive={false}
            />
            <Polyline
              positions={[
                [minLat, lng],
                [maxLat, lng],
              ]}
              pathOptions={{ color: "#0f2154", opacity: 0.16, weight: 1 }}
              interactive={false}
            />
          </Pane>
        );
      })}
    </Pane>
  );
}

export default function RescueMapCanvas({
  mapping,
  mode,
  language,
  selectedAoiId,
  epicenter,
  isOnline,
  onSelectAoi,
}: {
  mapping: RescueMapMappingSnapshot;
  mode: RescueMapMode;
  language: RescueMapLanguage;
  selectedAoiId: string | null;
  epicenter: { longitude: number; latitude: number; magnitude: number };
  isOnline: boolean;
  onSelectAoi: (aoiId: string) => void;
}) {
  const [mapReady, setMapReady] = useState(false);
  const [availableMode, setAvailableMode] = useState<RescueMapMode | null>(
    null,
  );
  const tileAvailable = availableMode === mode;

  const aois = useMemo(
    () =>
      mapping.aois.map((aoi) => ({
        ...aoi,
        rings: parsePolygonWkt(aoi.extentWkt),
        product: firstProduct(aoi),
      })),
    [mapping.aois],
  );
  const before = mapping.imagery.before;
  const after = mapping.imagery.after;
  const currentLayer =
    mode === "reference"
      ? mapping.imagery.reference
      : mode === "before"
        ? before
        : mode === "after"
          ? after
          : null;

  const markTilesAvailable = () => {
    setAvailableMode(mode);
  };

  const mapLabel =
    language === "es"
      ? "Mapa interactivo del sismo de Colombia con epicentro y cuatro áreas oficiales de cartografía Copernicus EMSR916"
      : "Interactive Colombia earthquake map with the epicenter and four official Copernicus EMSR916 mapping areas";

  return (
    <div
      id="mapa-de-rescate-canvas"
      className="e-rescue-map-shell"
      data-testid="rescue-map-canvas"
      data-mode={mode}
      data-selected-aoi={selectedAoiId ?? ""}
      data-visible-aoi-count={mapping.aois.length}
      data-before-ready={String(Boolean(before))}
      data-after-ready={String(Boolean(after))}
      data-map-ready={String(mapReady)}
      role="region"
      aria-label={mapLabel}
      tabIndex={0}
    >
      <MapContainer
        center={[3.87, -76.26]}
        zoom={7}
        minZoom={5}
        maxZoom={18}
        preferCanvas
        scrollWheelZoom
        zoomControl={false}
        attributionControl={false}
        keyboard
        className="e-rescue-map-canvas"
        whenReady={() => setMapReady(true)}
      >
        {mode === "map" ? (
          <TileLayer
            key="osm"
            url={OSM_URL}
            minZoom={0}
            maxZoom={19}
            eventHandlers={{
              tileload: markTilesAvailable,
            }}
          />
        ) : currentLayer ? (
          <TileLayer
            key={mode}
            url={currentLayer.urlTemplate}
            minZoom={currentLayer.minZoom}
            maxZoom={currentLayer.maxZoom}
            eventHandlers={{
              tileload: markTilesAvailable,
            }}
          />
        ) : null}

        <OfflineReferenceGrid
          mapping={mapping}
          visible={!isOnline || !tileAvailable}
        />
        <RescueMapCamera mapping={mapping} selectedAoiId={selectedAoiId} />
        <ZoomControl position="topright" />

        {aois.map(({ rings, product, ...aoi }) => {
          const selected = selectedAoiId === aoi.id;
          const isDamage = product?.type === "GRA";
          const color = isDamage ? "#eab308" : "#4080f2";
          return (
            <Polygon
              key={aoi.id}
              positions={rings}
              pathOptions={{
                color: selected ? "#ffffff" : color,
                dashArray: isDamage ? undefined : "8 6",
                fillColor: color,
                fillOpacity: selected ? 0.28 : 0.12,
                opacity: 1,
                weight: selected ? 4 : 2.5,
              }}
              eventHandlers={{
                click: () => onSelectAoi(aoi.id),
              }}
            >
              <Tooltip
                permanent
                direction="center"
                opacity={0.94}
                className="e-rescue-aoi-label"
              >
                AOI {String(aoi.number).padStart(2, "0")} ·{" "}
                {product?.type ?? "—"}
              </Tooltip>
              <Popup>
                <strong>{aoi.name[language]}</strong>
                <p>
                  {product?.type ?? "—"} ·{" "}
                  {product?.typeLabel[language] ?? "—"}
                </p>
              </Popup>
            </Polygon>
          );
        })}

        <CircleMarker
          center={[epicenter.latitude, epicenter.longitude]}
          radius={10}
          pathOptions={{
            color: "#ffffff",
            fillColor: "#ce1126",
            fillOpacity: 1,
            opacity: 1,
            weight: 4,
          }}
        >
          <Tooltip direction="top">
            {language === "es" ? "Epicentro" : "Epicenter"} · M
            {epicenter.magnitude}
          </Tooltip>
          <Popup>
            <strong>
              {language === "es" ? "Epicentro del sismo" : "Earthquake epicenter"}
            </strong>
            <p>
              M{epicenter.magnitude} · {epicenter.latitude.toFixed(2)},{" "}
              {epicenter.longitude.toFixed(2)}
            </p>
          </Popup>
        </CircleMarker>
      </MapContainer>
    </div>
  );
}
