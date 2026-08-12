import { describe, expect, it } from "vitest";
import { chipFitPoints } from "@/components/features/emergency/chip-fit";
import type { EmergencyReport } from "@/lib/types";

const report = (type: string, lat: number, lng: number) =>
	({ type, lat, lng }) as EmergencyReport;

const REPORTS = [
	report("building", 4.81, -75.69),
	report("building", 3.45, -76.53),
	report("shelter", 10.98, -74.8),
];

describe("chipFitPoints", () => {
	it("apagar un chip no mueve el mapa (regresión: antes re-encuadraba a la unión)", () => {
		expect(chipFitPoints("building", false, REPORTS, [])).toBeNull();
	});

	it("prender un chip encuadra solo los pines de ese tipo, no la unión", () => {
		const pts = chipFitPoints("building", true, REPORTS, []);
		expect(pts).toEqual([
			{ lat: 4.81, lng: -75.69 },
			{ lat: 3.45, lng: -76.53 },
		]);
	});

	it("prender un chip sin pines no mueve el mapa", () => {
		expect(chipFitPoints("supplies", true, REPORTS, [])).toBeNull();
	});

	it("missing suma los marcadores del viewport cargados", () => {
		const pts = chipFitPoints("missing", true, [], [{ lat: 4.8, lng: -75.7 }]);
		expect(pts).toEqual([{ lat: 4.8, lng: -75.7 }]);
	});
});
