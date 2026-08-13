"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { deploymentConfig } from "@/lib/deployment-config";
import { MapLoading } from "@/components/ui/SectionLoading";
import { mapViewZoom } from "@/lib/map-view-zoom";
import MapOverlays from "./MapOverlays";
import type { MapPanelProps } from "./MapPanel.types";

export type { MapPanelProps } from "./MapPanel.types";

const MapView = dynamic(() => import("@/components/features/map"), {
  ssr: false,
  loading: () => <MapLoading label="Cargando mapa de reportes…" />,
});

export default function MapPanel(props: MapPanelProps) {
  const [showRain, setShowRain] = useState(false);
  const [showClouds, setShowClouds] = useState(false);
  const isMobile = useMediaQuery("(max-width: 759px)");
  const zoom = mapViewZoom(deploymentConfig.mapZoom, isMobile);
  const {
    mapReports,
    missingMapMarkers,
    petMapMarkers,
    acopioCenters,
    earthquakes,
    showMissingOnMap,
    showPetsOnMap,
    showAcopioOnMap,
    draft,
    confirmed,
    isAdmin,
    focus,
    fitRequest,
    center,
    placing,
    onBoundsChange,
    onPick,
    onResolve,
    onConfirm,
  } = props;

  return (
    <div
      className={`map-shell e-leaflet-wrap flex h-full w-full flex-col overflow-hidden ${
        placing ? "is-placing" : ""
      }`}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <ErrorBoundary
          fallback={
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-100 p-6 text-center text-sm text-slate-600">
              <p className="font-semibold">No se pudo cargar el mapa</p>
              <p>Recarga la página para volver a intentarlo.</p>
            </div>
          }
        >
          <MapView
            reports={mapReports}
            missingMarkers={missingMapMarkers}
            petMarkers={petMapMarkers}
            acopioCenters={acopioCenters}
            earthquakes={earthquakes}
            showMissingOnMap={showMissingOnMap}
            showPetsOnMap={isMobile ? false : showPetsOnMap}
            showAcopioOnMap={isMobile ? false : showAcopioOnMap}
            onBoundsChange={onBoundsChange}
            draft={draft}
            onPick={onPick}
            onResolve={onResolve}
            onConfirm={onConfirm}
            confirmed={confirmed}
            isAdmin={isAdmin}
            focus={focus}
            center={center}
            zoom={zoom}
            fitRequest={fitRequest}
            showRain={showRain}
            showClouds={showClouds}
          />
        </ErrorBoundary>
        <MapOverlays
          petMapMarkers={props.petMapMarkers}
          showPetsOnMap={props.showPetsOnMap}
          onTogglePets={props.onTogglePets}
          acopioCenters={props.acopioCenters}
          showAcopioOnMap={props.showAcopioOnMap}
          onToggleAcopio={props.onToggleAcopio}
          selectedTypes={props.selectedTypes}
          counts={props.counts}
          addressBias={props.addressBias}
          placing={placing}
          shareCopied={props.shareCopied}
          onAddressSelect={props.onAddressSelect}
          onChipClick={props.onChipClick}
          onCancelPlacing={props.onCancelPlacing}
          onShare={props.onShare}
          onStartReport={props.onStartReport}
          showRain={showRain}
          showClouds={showClouds}
          onToggleRain={() => setShowRain((v) => !v)}
          onToggleClouds={() => setShowClouds((v) => !v)}
        />
      </div>
    </div>
  );
}
