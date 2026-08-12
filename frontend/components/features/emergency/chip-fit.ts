import type { EmergencyReport, ReportType } from "@/lib/types";

export type ChipFitPoint = { lat: number; lng: number };

/** Pines a encuadrar al tocar un chip de tipo. Regla: solo al PRENDER y solo
 * los pines de ESE tipo (apagar nunca mueve el mapa; antes cualquier toque
 * re-encuadraba a la unión nacional y sacaba al usuario de su ciudad). */
export function chipFitPoints(
	type: ReportType,
	activating: boolean,
	reports: EmergencyReport[],
	missingMarkers: ChipFitPoint[],
): ChipFitPoint[] | null {
	if (!activating) return null;
	const points = reports
		.filter((r) => r.type === type)
		.map((r) => ({ lat: r.lat, lng: r.lng }));
	if (type === "missing") points.push(...missingMarkers);
	return points.length > 0 ? points : null;
}
