"use client";

import { useCallback, useState } from "react";
import { trackEvent } from "@/lib/openpanel";

type Coords = { lat: number; lng: number };

type ReportFormLocationProps = {
  coords: Coords | null;
  onCoordsChange?: (coords: Coords) => void;
  onPickOnMap?: () => void;
  onClearLocation?: () => void;
};

export function ReportFormLocation({
  coords,
  onCoordsChange,
  onPickOnMap,
  onClearLocation,
}: ReportFormLocationProps) {
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const useMyLocation = useCallback(() => {
    trackEvent("report_use_geolocation");
    if (!("geolocation" in navigator)) {
      setGeoError("Tu navegador no soporta geolocalización.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onCoordsChange?.({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Permiso denegado. Activa la ubicación en los permisos del sitio."
            : "No se pudo obtener tu ubicación. Toca el mapa manualmente.",
        );
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, [onCoordsChange]);

  return (
    <>
      <div
        className={`rounded-xl border p-3 ${
          coords
            ? "border-[var(--eborder)] bg-[var(--esurf2)]"
            : "border-amber-300 bg-amber-50"
        }`}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="flex min-w-0 flex-1 items-center gap-1.5 text-xs font-semibold text-[var(--etext)]">
            <span aria-hidden>📍</span>
            {coords ? (
              <span className="truncate font-normal tabular-nums text-[var(--etext2)]">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </span>
            ) : (
              <span className="font-normal text-amber-700">
                Ubicación sin definir — elígela aquí
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {onPickOnMap && (
              <button
                type="button"
                onClick={onPickOnMap}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--eborder)] bg-[var(--esurf)] px-2.5 py-1.5 text-xs font-semibold text-[var(--etext)] hover:bg-[var(--esurf2)]"
              >
                🗺️ Elegir en el mapa
              </button>
            )}
            {onCoordsChange && (
              <button
                type="button"
                onClick={useMyLocation}
                data-track="report_use_geolocation_click"
                disabled={locating}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--eborder)] bg-[var(--esurf)] px-2.5 py-1.5 text-xs font-medium text-[var(--etext)] hover:bg-[var(--esurf2)] disabled:opacity-60"
              >
                {locating ? "Localizando…" : "🛰️ Usar mi ubicación"}
              </button>
            )}
            {coords && onClearLocation && (
              <button
                type="button"
                onClick={onClearLocation}
                aria-label="Quitar la ubicación elegida"
                className="inline-flex items-center gap-1 rounded-full border border-[var(--eborder)] bg-[var(--esurf)] px-2.5 py-1.5 text-xs font-medium text-[var(--etext2)] hover:bg-[var(--esurf2)]"
              >
                ✕ Quitar
              </button>
            )}
          </div>
        </div>
      </div>
      {geoError && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">
          {geoError}
        </p>
      )}
    </>
  );
}
