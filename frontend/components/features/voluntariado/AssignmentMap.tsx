"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { useClientMount } from "@/hooks/useClientMount";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, ZoomControl } from "react-leaflet";
import { ResizeHandler } from "@/components/features/map/handlers";
import type { AssignmentTask } from "@/hooks/voluntariado";

function pointIcon(color: string, label: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<span style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;background:${color};color:#fff;font-size:11px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.25)">${label}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

/** Encuadra el mapa en los dos puntos del traslado (origen + destino). */
function FitBounds({ points }: { points: L.LatLngExpression[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
    }
  }, [map, points]);
  return null;
}

function AssignmentMapInner({ task }: { task: AssignmentTask }) {
  const originIcon = useMemo(() => pointIcon("#1f8a5b", "A"), []);
  const destIcon = useMemo(() => pointIcon("#003893", "B"), []);
  const origin: L.LatLngTuple | null =
    task.originLat !== null && task.originLng !== null ? [task.originLat, task.originLng] : null;
  const dest: L.LatLngTuple | null =
    task.destLat !== null && task.destLng !== null ? [task.destLat, task.destLng] : null;
  const points: L.LatLngExpression[] = [origin, dest].filter(
    (p): p is L.LatLngTuple => p !== null,
  );

  if (points.length === 0) return null;

  return (
    <MapContainer
      center={points[0]}
      zoom={12}
      scrollWheelZoom
      zoomControl={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="topright" />
      <ResizeHandler />
      <FitBounds points={points} />
      {origin && (
        <Marker position={origin} icon={originIcon}>
          <Popup>
            <strong>A — Recoger aquí</strong>
            <p className="mt-1 text-xs">{task.originName}</p>
          </Popup>
        </Marker>
      )}
      {dest && (
        <Marker position={dest} icon={destIcon}>
          <Popup>
            <strong>B — Entregar aquí</strong>
            <p className="mt-1 text-xs">{task.destName}</p>
          </Popup>
        </Marker>
      )}
      {origin && dest && (
        <Polyline positions={[origin, dest]} pathOptions={{ color: "#003893", dashArray: "6 8" }} />
      )}
    </MapContainer>
  );
}

export default function AssignmentMap(props: { task: AssignmentTask }) {
  const mounted = useClientMount();
  if (!mounted) {
    return <div className="flex h-full items-center justify-center text-sm text-slate-500">Cargando mapa…</div>;
  }
  return <AssignmentMapInner {...props} />;
}
