import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  firstProduct,
  isPolygonWkt,
  isRescueMapIncident,
  isRescueMapMappingSnapshot,
  parsePolygonWkt,
  type RescueMapMappingSnapshot,
  type RescueMapMappingAoi,
} from "@/lib/rescue-map";

// The mapping snapshot and the incident record are real, versioned JSON
// fixtures shipped under `frontend/public/data/incidents/`. We read them
// from the filesystem so the tests break loudly if a future refactor changes
// the schema instead of silently passing against an in-memory stub.
const MAPPING_SNAPSHOT_PATH = resolve(
  __dirname,
  "../../public/data/incidents/colombia-2026-08-10-emsr916-map.json",
);
const INCIDENT_PATH = resolve(
  __dirname,
  "../../public/data/incidents/colombia-2026-08-10-san-jose-del-palmar.json",
);

const mappingSnapshot = JSON.parse(
  readFileSync(MAPPING_SNAPSHOT_PATH, "utf8"),
) as RescueMapMappingSnapshot;
const incidentJson = JSON.parse(readFileSync(INCIDENT_PATH, "utf8")) as unknown;

// ---------------------------------------------------------------------------
// parsePolygonWkt
// ---------------------------------------------------------------------------

describe("parsePolygonWkt", () => {
  it("devuelve un array vacío para POLYGON EMPTY", () => {
    expect(parsePolygonWkt("POLYGON EMPTY")).toEqual([]);
  });

  it("interpreta un POLYGON de un solo anillo en orden (lng lat) -> [lat, lng]", () => {
    const wkt =
      "POLYGON ((-77.438592 2.089484, -75.22383 5.479108, -77.438592 5.479108, -77.438592 2.089484))";
    const [ring] = parsePolygonWkt(wkt);
    expect(ring).toEqual([
      [2.089484, -77.438592],
      [5.479108, -75.22383],
      [5.479108, -77.438592],
      [2.089484, -77.438592],
    ]);
  });

  it("acepta anillo exterior + huecos", () => {
    const wkt =
      "POLYGON ((0 0, 0 10, 10 10, 10 0, 0 0), (2 2, 8 2, 8 8, 2 8, 2 2))";
    const [exterior, hole] = parsePolygonWkt(wkt);
    expect(exterior).toHaveLength(5);
    expect(exterior[0]).toEqual([0, 0]);
    expect(hole).toHaveLength(5);
    expect(hole[0]).toEqual([2, 2]);
  });

  it("tolera espacios y mayúsculas/minúsculas", () => {
    const wkt = "polygon(  ( 1 2 ,  3 4 , 4 2,  1 2 ) )";
    const [ring] = parsePolygonWkt(wkt);
    expect(ring).toEqual([
      [2, 1],
      [4, 3],
      [2, 4],
      [2, 1],
    ]);
  });

  it("lanza error para strings que no son POLYGON", () => {
    expect(() => parsePolygonWkt("POINT (1 2)")).toThrow();
    expect(() => parsePolygonWkt("LINESTRING (0 0, 1 1)")).toThrow();
    expect(() => parsePolygonWkt("")).toThrow();
    expect(() => parsePolygonWkt("POLYGON")).toThrow();
  });

  it("lanza error para un par de coordenadas mal formado", () => {
    expect(() => parsePolygonWkt("POLYGON ((1 2, 3 4 5, 1 2))")).toThrow();
    expect(() => parsePolygonWkt("POLYGON ((a b, 1 2, 1 2))")).toThrow();
  });

  it("lanza error para coordenadas no finitas", () => {
    expect(() => parsePolygonWkt("POLYGON ((NaN 0, 1 0, 0 0))")).toThrow();
    expect(() =>
      parsePolygonWkt("POLYGON ((0 0, Infinity 1, 0 0))"),
    ).toThrow();
  });

  it("lanza error cuando el anillo exterior tiene menos de 4 vértices", () => {
    expect(() => parsePolygonWkt("POLYGON ((0 0, 1 1))")).toThrow();
  });

  it("lanza error cuando el anillo exterior no está cerrado", () => {
    expect(() =>
      parsePolygonWkt("POLYGON ((0 0, 1 0, 1 1, 0 1))"),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// isPolygonWkt
// ---------------------------------------------------------------------------

describe("isPolygonWkt", () => {
  it("devuelve true para POLYGON y POLYGON EMPTY", () => {
    expect(isPolygonWkt("POLYGON ((0 0, 1 1, 0 0))")).toBe(true);
    expect(isPolygonWkt("POLYGON EMPTY")).toBe(true);
    expect(isPolygonWkt("  polygon  empty  ")).toBe(true);
  });

  it("devuelve false para entradas no válidas", () => {
    expect(isPolygonWkt("")).toBe(false);
    expect(isPolygonWkt("POLYGON")).toBe(false);
    expect(isPolygonWkt("POINT (1 2)")).toBe(false);
    expect(isPolygonWkt(123)).toBe(false);
    expect(isPolygonWkt(null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Shape guards
// ---------------------------------------------------------------------------

describe("isRescueMapMappingSnapshot", () => {
  it("acepta el mapping snapshot real del fixture", () => {
    expect(isRescueMapMappingSnapshot(mappingSnapshot)).toBe(true);
  });

  it("rechaza el incident JSON (las claves top-level no coinciden)", () => {
    expect(isRescueMapMappingSnapshot(incidentJson)).toBe(false);
  });

  it("rechaza un objeto sin aois", () => {
    expect(
      isRescueMapMappingSnapshot({
        schemaVersion: "1.0.0",
        activationCode: "X",
        activationName: "X",
        category: "Earthquake",
        status: "open",
        eventUtc: "2026-08-10T00:00:00Z",
        activatedUtc: "2026-08-10T00:00:00Z",
        lastCheckedAt: "2026-08-10T00:00:00Z",
        sourceUrl: "https://example.org",
        situationUrl: "https://example.org",
        productsUrl: "https://example.org",
        centroidWkt: "POINT (0 0)",
        extentWkt: "POLYGON ((0 0, 1 0, 1 1, 0 0))",
      }),
    ).toBe(false);
  });

  it("rechaza centroidWkt que no es un WKT", () => {
    const bad = {
      ...mappingSnapshot,
      centroidWkt: "not a wkt",
    };
    expect(isRescueMapMappingSnapshot(bad)).toBe(false);
  });

  it("acepta centroidWkt POINT (el snapshot usa POINT, no POLYGON)", () => {
    const ok = {
      ...mappingSnapshot,
      centroidWkt: "POINT (-76.25 3.87)",
    };
    expect(isRescueMapMappingSnapshot(ok)).toBe(true);
  });

  it("rechaza extentWkt que no es un POLYGON", () => {
    const bad = {
      ...mappingSnapshot,
      extentWkt: "POINT (0 0)",
    };
    expect(isRescueMapMappingSnapshot(bad)).toBe(false);
  });
});

describe("isRescueMapIncident", () => {
  it("acepta el incident JSON real del fixture", () => {
    expect(isRescueMapIncident(incidentJson)).toBe(true);
  });

  it("rechaza el mapping snapshot JSON", () => {
    expect(isRescueMapIncident(mappingSnapshot)).toBe(false);
  });

  it("rechaza un objeto sin event/tsunami", () => {
    expect(
      isRescueMapIncident({
        schemaVersion: "1.0.0",
        incidentId: "x",
        slug: "x",
        country: { es: "x", en: "x" },
        status: "activated",
        statusLabel: { es: "x", en: "x" },
        activatedAt: "2026-08-10T00:00:00Z",
        lastVerifiedAt: "2026-08-10T00:00:00Z",
        verificationScope: { es: "x", en: "x" },
      }),
    ).toBe(false);
  });

  it("rechaza entradas que no son objetos", () => {
    expect(isRescueMapIncident(null)).toBe(false);
    expect(isRescueMapIncident("incident")).toBe(false);
    expect(isRescueMapIncident(42)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GRA vs GRM differentiation
// ---------------------------------------------------------------------------

describe("AOI products distinguish GRA damage assessment from GRM ground movement", () => {
  it("AOI 00 publica un único producto GRM (movimiento del terreno)", () => {
    const aoi = findAoiByNumber(mappingSnapshot, 0);
    expect(aoi).toBeDefined();
    expect(aoi?.products).toHaveLength(1);
    const product = aoi?.products[0];
    expect(product?.type).toBe("GRM");
    expect(product?.typeLabel.en).toBe("Ground movement");
    expect(product?.typeLabel.es).toBe("Movimiento del terreno");
    expect(product?.images[0]?.sensorType).toBe("sar");
  });

  it("AOI 01 publica un único producto GRA (evaluación de daños)", () => {
    const aoi = findAoiByNumber(mappingSnapshot, 1);
    expect(aoi).toBeDefined();
    expect(aoi?.products).toHaveLength(1);
    const product = aoi?.products[0];
    expect(product?.type).toBe("GRA");
    expect(product?.typeLabel.en).toBe("Damage assessment");
    expect(product?.typeLabel.es).toBe("Evaluación de daños");
    expect(product?.images[0]?.sensorType).toBe("optical");
  });

  it("AOI 02 publica un único producto GRA (evaluación de daños)", () => {
    const aoi = findAoiByNumber(mappingSnapshot, 2);
    expect(aoi).toBeDefined();
    expect(aoi?.products).toHaveLength(1);
    const product = aoi?.products[0];
    expect(product?.type).toBe("GRA");
    expect(product?.typeLabel.en).toBe("Damage assessment");
    expect(product?.images[0]?.sensorType).toBe("optical");
  });

  it("AOI 03 publica un único producto GRA (evaluación de daños)", () => {
    const aoi = findAoiByNumber(mappingSnapshot, 3);
    expect(aoi).toBeDefined();
    expect(aoi?.products).toHaveLength(1);
    const product = aoi?.products[0];
    expect(product?.type).toBe("GRA");
    expect(product?.typeLabel.en).toBe("Damage assessment");
    expect(product?.images[0]?.sensorType).toBe("optical");
  });

  it("firstProduct devuelve el único producto (no el siguiente)", () => {
    const aoi = findAoiByNumber(mappingSnapshot, 1);
    if (!aoi) throw new Error("AOI 01 missing");
    const product = firstProduct(aoi);
    expect(product).not.toBeNull();
    expect(product?.type).toBe("GRA");
  });
});

// ---------------------------------------------------------------------------
// All four AOIs
// ---------------------------------------------------------------------------

describe("Mapping snapshot includes the four AOIs of EMSR916", () => {
  it("tiene exactamente cuatro AOIs", () => {
    expect(mappingSnapshot.aois).toHaveLength(4);
  });

  it("los IDs y números siguen el patrón emsr916-aoiNN (0..3)", () => {
    expect(mappingSnapshot.aois.map((a) => a.id)).toEqual([
      "emsr916-aoi00",
      "emsr916-aoi01",
      "emsr916-aoi02",
      "emsr916-aoi03",
    ]);
    expect(mappingSnapshot.aois.map((a) => a.number)).toEqual([0, 1, 2, 3]);
  });

  it("cada AOI expone un extentWkt parseable", () => {
    for (const aoi of mappingSnapshot.aois) {
      expect(isPolygonWkt(aoi.extentWkt)).toBe(true);
      const rings = parsePolygonWkt(aoi.extentWkt);
      expect(rings.length).toBeGreaterThanOrEqual(1);
      expect(rings[0]?.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("cada AOI tiene una etiqueta bilingüe y al menos un producto", () => {
    for (const aoi of mappingSnapshot.aois) {
      expect(typeof aoi.name.es).toBe("string");
      expect(typeof aoi.name.en).toBe("string");
      expect(aoi.name.es.length).toBeGreaterThan(0);
      expect(aoi.name.en.length).toBeGreaterThan(0);
      expect(aoi.products.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Coordinates
// ---------------------------------------------------------------------------

describe("Coordinates", () => {
  it("el centroidWkt es sintácticamente un WKT POINT (lng lat)", () => {
    const trimmed = mappingSnapshot.centroidWkt.trim();
    expect(trimmed.startsWith("POINT")).toBe(true);
  });

  it("el extentWkt se centra alrededor del centroid (FIRST-AOI primer vértice dentro del bbox)", () => {
    const aoi = findAoiByNumber(mappingSnapshot, 0);
    if (!aoi) throw new Error("AOI 00 missing");
    const [exterior] = parsePolygonWkt(aoi.extentWkt);
    const [firstLat, firstLng] = exterior[0] ?? [NaN, NaN];
    // Centroid copernico: ~lat 3.87, lng -76.26. El primer vértice de AOI 00
    // queda en lat 3.47, lng -77.17 — dentro del bbox del extent global.
    expect(firstLat).toBeGreaterThan(2);
    expect(firstLat).toBeLessThan(6);
    expect(firstLng).toBeGreaterThan(-78);
    expect(firstLng).toBeLessThan(-75);
  });

  it("los cuatro AOIs producen anillos exteriores en orden [lat, lng] Leaflet-friendly", () => {
    for (const aoi of mappingSnapshot.aois) {
      const [ring] = parsePolygonWkt(aoi.extentWkt);
      for (const vertex of ring) {
        const [lat, lng] = vertex;
        expect(lat).toBeGreaterThan(-90);
        expect(lat).toBeLessThan(90);
        expect(lng).toBeGreaterThan(-180);
        expect(lng).toBeLessThan(180);
      }
    }
  });

  it("el extentWkt global cubre un bounding box coherente con el centroid", () => {
    const rings = parsePolygonWkt(mappingSnapshot.extentWkt);
    const [exterior] = rings;
    const lats = exterior.map(([lat]) => lat);
    const lngs = exterior.map(([, lng]) => lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    // Centroid ~3.87,-76.26 debe caer dentro del extent global.
    expect(minLat).toBeLessThan(3.87);
    expect(maxLat).toBeGreaterThan(3.87);
    expect(minLng).toBeLessThan(-76.26);
    expect(maxLng).toBeGreaterThan(-76.26);
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findAoiByNumber(
  snapshot: RescueMapMappingSnapshot,
  number: number,
): RescueMapMappingAoi | undefined {
  return snapshot.aois.find((a) => a.number === number);
}
