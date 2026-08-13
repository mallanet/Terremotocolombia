import AddressSearch from "@/components/features/emergency/AddressSearch";
import FilterChips from "./FilterChips";
import MapTutorialButton from "./MapTutorial";
import type { MapPanelProps } from "./MapPanel.types";

type OverlayProps = Pick<
  MapPanelProps,
  | "petMapMarkers"
  | "showPetsOnMap"
  | "onTogglePets"
  | "acopioCenters"
  | "showAcopioOnMap"
  | "onToggleAcopio"
  | "selectedTypes"
  | "counts"
  | "addressBias"
  | "placing"
  | "shareCopied"
  | "onAddressSelect"
  | "onChipClick"
  | "onCancelPlacing"
  | "onShare"
  | "onStartReport"
> & {
  showRain: boolean;
  showClouds: boolean;
  onToggleRain: () => void;
  onToggleClouds: () => void;
};

export default function MapOverlays({
  petMapMarkers,
  showPetsOnMap,
  onTogglePets,
  acopioCenters,
  showAcopioOnMap,
  onToggleAcopio,
  selectedTypes,
  counts,
  addressBias,
  placing,
  shareCopied,
  onAddressSelect,
  onChipClick,
  onCancelPlacing,
  onShare,
  onStartReport,
  showRain,
  showClouds,
  onToggleRain,
  onToggleClouds,
}: OverlayProps) {
  return (
    <>
      <div className="map-overlay pointer-events-none absolute inset-x-0 top-0 z-[1000] flex flex-col gap-2 p-2 sm:p-3 sm:pr-14">
        <div className="pointer-events-auto flex min-w-0 flex-col gap-2 xl:flex-row xl:items-stretch">
          <div className="w-full shrink-0 xl:max-w-xs" data-tour="map-search">
            <AddressSearch onSelect={onAddressSelect} bias={addressBias} />
          </div>
          <div data-tour="map-filters">
            <FilterChips
              selectedTypes={selectedTypes}
              counts={counts}
              onChipClick={onChipClick}
            />
          </div>
          <button
            type="button"
            onClick={onTogglePets}
            aria-pressed={showPetsOnMap}
            title={`Mascotas perdidas: ${petMapMarkers.length}`}
            aria-label={`Mascotas perdidas: ${petMapMarkers.length} en el mapa. ${
              showPetsOnMap
                ? "Visibles, toca para ocultar."
                : "Ocultas, toca para mostrar."
            }`}
            className={`e-m-chip hidden shrink-0 md:inline-flex${showPetsOnMap ? " e-m-chip--active" : ""}`}
          >
            <span aria-hidden>🐾</span> Mascotas
            {petMapMarkers.length > 0 && (
              <span className="ml-1 tabular-nums">{petMapMarkers.length}</span>
            )}
          </button>
          <button
            type="button"
            onClick={onToggleAcopio}
            aria-pressed={showAcopioOnMap}
            title={`Centros de acopio: ${acopioCenters.length}`}
            aria-label={`Centros de acopio: ${acopioCenters.length} en el mapa. ${
              showAcopioOnMap
                ? "Visibles, toca para ocultar."
                : "Ocultos, toca para mostrar."
            }`}
            className={`e-m-chip hidden shrink-0 md:inline-flex${showAcopioOnMap ? " e-m-chip--active" : ""}`}
          >
            <span aria-hidden>📦</span> Acopio
            {acopioCenters.length > 0 && (
              <span className="ml-1 tabular-nums">{acopioCenters.length}</span>
            )}
          </button>
        </div>
      </div>

      <div className="map-overlay pointer-events-auto absolute right-3 top-20 z-[1000] hidden flex-col gap-1.5 rounded-lg bg-white/95 p-1.5 shadow-lg ring-1 ring-black/5 backdrop-blur md:flex">
        <button
          type="button"
          onClick={onToggleRain}
          aria-pressed={showRain}
          aria-label="Mostrar lluvia en el mapa"
          title="Radar de lluvia (RainViewer)"
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
            showRain
              ? "bg-blue-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span aria-hidden>🌧️</span>
          <span>Lluvia</span>
        </button>
        <button
          type="button"
          onClick={onToggleClouds}
          aria-pressed={showClouds}
          aria-label="Mostrar nubes en el mapa"
          title="Nubes globales (EUMETSAT)"
          className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${
            showClouds
              ? "bg-slate-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span aria-hidden>☁️</span>
          <span>Nubes</span>
        </button>
      </div>

      {placing ? (
        <>
          <div
            className="pointer-events-none absolute inset-0 z-[1150] bg-slate-900/25"
            aria-hidden
          />
          <div className="pointer-events-auto absolute inset-x-0 top-0 z-[1200] flex items-center justify-between gap-3 bg-slate-900 px-4 py-3 text-white shadow-lg">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <span aria-hidden className="text-base">
                📍
              </span>
              Toca el mapa para ubicar el reporte
            </span>
            <button
              type="button"
              onClick={onCancelPlacing}
              className="shrink-0 rounded-md border border-white/40 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/10"
            >
              Volver
            </button>
          </div>
        </>
      ) : null}

      <div className="map-overlay pointer-events-none absolute inset-x-0 bottom-3 z-[1000] flex justify-center px-3 max-md:bottom-[4.75rem]">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-white/95 p-1.5 shadow-lg ring-1 ring-black/5 backdrop-blur">
          <button
            type="button"
            onClick={onShare}
            aria-label="Compartir el mapa"
            title="Compartir el mapa"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            <span aria-hidden>{shareCopied ? "✓" : "🔗"}</span>
            <span className="hidden sm:inline">{shareCopied ? "Copiado" : "Compartir"}</span>
          </button>
          <MapTutorialButton />
          <button
            type="button"
            onClick={onStartReport}
            data-tour="map-report"
            className="shrink-0 rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
          >
            Reportar Información
          </button>
        </div>
      </div>
    </>
  );
}
