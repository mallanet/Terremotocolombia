import { memo, useMemo } from "react";
import L from "leaflet";
import { Marker, Popup } from "react-leaflet";
import type { CollectionCenter } from "@/hooks/acopio";

let acopioIconCache: L.DivIcon | null = null;
function acopioIcon(): L.DivIcon {
  if (acopioIconCache) return acopioIconCache;
  acopioIconCache = L.divIcon({
    className: "emergency-marker",
    html: `<span class="emergency-pin" style="background:#1f8a5b"><span class="emergency-pin__icon">📦</span></span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -30],
  });
  return acopioIconCache;
}

function acceptsLabel(accepts: readonly string[]): string {
  const labels: Record<string, string> = {
    food: "Alimentos",
    water: "Agua",
    medicines: "Medicinas",
    medical_supplies: "Insumos médicos",
    clothing: "Ropa",
    shelter: "Refugio",
    hygiene: "Higiene",
    blankets: "Cobijas / colchonetas",
    blood: "Sangre",
    tools: "Herramientas de rescate",
  };
  return accepts.map((k) => labels[k] ?? k).join(", ");
}

function AcopioLayerBase({ centers }: { centers: CollectionCenter[] }) {
  const icon = useMemo(() => acopioIcon(), []);
  const mappable = useMemo(
    () => centers.filter((c) => c.lat != null && c.lng != null),
    [centers],
  );
  if (mappable.length === 0) return null;
  return (
    <>
      {mappable.map((center) => (
        <Marker
          key={`acopio:${center.id}`}
          position={[center.lat!, center.lng!]}
          icon={icon}
        >
          <Popup>
            <div className="min-w-[200px] text-sm">
              <strong className="block">{center.name}</strong>
              {center.city && (
                <span className="block text-xs text-slate-600">
                  {[center.city, center.country].filter(Boolean).join(" · ")}
                </span>
              )}
              {center.address && (
                <span className="mt-1 block text-xs text-slate-500">
                  {center.address}
                </span>
              )}
              {center.accepts.length > 0 && (
                <span className="mt-1 block text-xs">
                  Recibe: {acceptsLabel(center.accepts)}
                </span>
              )}
              {center.description && (
                <span className="mt-1 block text-xs text-slate-500">
                  {center.description}
                </span>
              )}
              <a
                href="/acopio"
                className="mt-2 inline-block text-xs font-semibold text-emerald-700 underline"
              >
                Ver todos los centros
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

export const AcopioLayer = memo(AcopioLayerBase);
