"use client";

import type L from "leaflet";
import { useCallback, useMemo, useRef } from "react";
import { MapContainer, Marker, TileLayer, ZoomControl } from "react-leaflet";
import { useClientMount } from "@/hooks/useClientMount";
import { MissingClusterLayer } from "./ClusterLayer";
import { PetClusterLayer } from "./PetClusterLayer";
import {
	BoundsHandler,
	ClickHandler,
	EscClosePopup,
	FitToBoundsHandler,
	FlyToHandler,
	ResizeHandler,
} from "./handlers";
import { draftIcon as makeDraftIcon } from "./icons";
import { ReportMarker } from "./ReportMarker";
import { EarthquakeLayer } from "./EarthquakeLayer";
import { AcopioLayer } from "./AcopioLayer";
import type { MapViewProps } from "./types";
import WeatherLayer from "./WeatherLayer";
import { MapLoading } from "@/components/ui/SectionLoading";

export type { MapBounds, MapViewProps } from "./types";

function MapViewInner({
	reports,
	missingMarkers = [],
	petMarkers = [],
	acopioCenters = [],
	earthquakes = [],
	showMissingOnMap = true,
	showPetsOnMap = true,
	showAcopioOnMap = true,
	onBoundsChange,
	draft,
	onPick,
	onResolve,
	onConfirm,
	confirmed,
	isAdmin,
	focus,
	center,
	zoom,
	fitRequest = null,
	showRain = false,
	showClouds = false,
}: MapViewProps) {
	const markerRefs = useRef<Map<string, L.Marker>>(new Map());
	const getMarker = useCallback((id: string) => markerRefs.current.get(id), []);

	const draftIcon = useMemo(() => makeDraftIcon(), []);

	return (
		<MapContainer
			center={center}
			zoom={zoom}
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
			<FlyToHandler focus={focus} getMarker={getMarker} />
			<FitToBoundsHandler fitRequest={fitRequest} />
			<EscClosePopup />

			{(showRain || showClouds) && (
				<WeatherLayer showRain={showRain} showClouds={showClouds} />
			)}
			<EarthquakeLayer earthquakes={earthquakes} />
			<BoundsHandler onBoundsChange={onBoundsChange} />
			<ClickHandler onPick={onPick} />

			{showMissingOnMap && (
				<MissingClusterLayer markers={missingMarkers} markerRefs={markerRefs} />
			)}

			{showPetsOnMap && petMarkers.length > 0 && (
				<PetClusterLayer markers={petMarkers} markerRefs={markerRefs} />
			)}

			{showAcopioOnMap && acopioCenters.length > 0 && (
				<AcopioLayer centers={acopioCenters} />
			)}

			{reports.map((report) => (
				<ReportMarker
					key={report.id}
					report={report}
					confirmed={confirmed.has(report.id)}
					isAdmin={isAdmin}
					onConfirm={onConfirm}
					onResolve={onResolve}
					markerRefs={markerRefs}
				/>
			))}

			{draft && <Marker position={[draft.lat, draft.lng]} icon={draftIcon} />}
		</MapContainer>
	);
}

/** Leaflet usa DOM al crear iconos; esperamos al montaje en cliente. */
export default function MapView(props: MapViewProps) {
	const mounted = useClientMount();

	if (!mounted) {
		return (
			<MapLoading />
		);
	}

	return <MapViewInner {...props} />;
}
