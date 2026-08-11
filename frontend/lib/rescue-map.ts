/**
 * Static-data and pure-domain slice for the `/mapa-de-rescate` experience.
 *
 * Two JSON fixtures in `frontend/public/data/incidents/` are the source of
 * truth at runtime:
 *
 *  - `colombia-2026-08-10-san-jose-del-palmar.json` — the incident record
 *    (event origin, tsunami assessment, public damage layer, source policy,
 *    situation known/unconfirmed/unknown, safety advisories, operational
 *    priorities, privacy policy).
 *  - `colombia-2026-08-10-emsr916-map.json` — the Copernicus EMSR916 mapping
 *    snapshot (centroid + extent, imagery layers, and the four official AOIs
 *    with their GRA/GRM products).
 *
 * This module is a leaf: it has no DOM, no React, no network, no database, and
 * no PII. It adapts the strict types from the source repository, adds a pure
 * POLYGON WKT parser (Leaflet `[lat, lng]` ordering), minimal runtime shape
 * guards for the downloaded JSON, and a helper (`firstProduct`) for the UI
 * layer.
 *
 * The decoupled future public-layer types — `RescueMapVerifiedNeed` and
 * `RescueMapResourceAvailability` — describe the *aggregate* surface the
 * mapa-de-rescate page will eventually show on top of the static data. They
 * carry no PII and no sample records; they exist here so downstream UI work
 * does not import private fields from the upload forms just to render a
 * public chip.
 */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** Languages referenced by the bilingual labels carried in the source JSON. */
export type RescueMapLanguage = "es" | "en";

/**
 * Bilingual text used across the incident and mapping snapshots. Loosely
 * kept to `es`/`en` to match the source schema; the upstream data does not
 * carry additional ISO codes today.
 */
export interface BilingualLabel {
  es: string;
  en: string;
}

// ---------------------------------------------------------------------------
// Copernicus-style mapping snapshot
// ---------------------------------------------------------------------------

/** Imagery role carried by a verified temporal layer. */
export type RescueMapImageryRole = "before" | "after";

/** Sensor type tags emitted by Copernicus Rapid Mapping. */
export type RescueMapSensorType = "optical" | "sar" | string;

/**
 * Verified before/after imagery. These fields are intentionally stricter
 * than the visual-reference layer: a temporal comparison must carry a date
 * and a license before it can be enabled.
 */
export interface RescueMapImageryLayer {
  role: RescueMapImageryRole;
  urlTemplate: string;
  minZoom: number;
  maxZoom: number;
  source: string;
  attribution: string;
  acquisitionUtc: string;
  license: string;
  limitations: BilingualLabel;
}

/**
 * Orientation-only basemap. It deliberately has no acquisition timestamp:
 * presenting one without verification would turn Esri World Imagery into a
 * false before/after claim.
 */
export interface RescueMapReferenceLayer {
  role: "visual-reference-only";
  urlTemplate: string;
  minZoom: number;
  maxZoom: number;
  source: string;
  attribution: string;
  limitations: BilingualLabel;
}

/** A single acquired image inside a mapping product. */
export interface RescueMapMappingImage {
  uuid: string;
  sensorType: RescueMapSensorType;
  sensor: string;
  resolutionClass: string;
  acquisitionUtc: string;
  fileName: string | null;
}

/** Copernicus product type. Other codes may appear as upstream evolves. */
export type RescueMapProductType = "GRA" | "GRM" | string;

/** Copernicus product status. */
export type RescueMapProductStatus = "waiting" | "ready" | string;

/**
 * A single Copernicus mapping product (GRA = damage assessment, GRM = ground
 * movement). All timestamps are ISO 8601 UTC; nullable fields are nullable
 * in the upstream schema too.
 */
export interface RescueMapMappingProduct {
  id: number;
  type: RescueMapProductType;
  typeLabel: BilingualLabel;
  monitoring: boolean;
  feasible: boolean;
  expectedDeliveryUtc: string | null;
  statusCode: string;
  status: RescueMapProductStatus;
  deliveryUtc: string | null;
  downloadPath: string | null;
  images: RescueMapMappingImage[];
}

/**
 * An Area of Interest (AOI) inside a Copernicus activation. `extentWkt` is
 * always a POLYGON WKT string in (lng lat) order — parsed by
 * `parsePolygonWkt` to Leaflet `[lat, lng]` tuples.
 */
export interface RescueMapMappingAoi {
  id: string;
  number: number;
  name: BilingualLabel;
  extentWkt: string;
  blpUrl: string | null;
  products: RescueMapMappingProduct[];
}

/** Lifecycle of the activation snapshot. */
export type RescueMapMappingStatus = "open" | "closed" | string;

/** State of the before/after comparison. */
export type RescueMapComparisonState = "scheduled" | "partial" | "ready" | string;

/**
 * Snapshot of a Copernicus Rapid Mapping activation. The page treats this
 * file as read-only, so the type is intentionally closed at the top level
 * (allowed fields only).
 */
export interface RescueMapMappingSnapshot {
  schemaVersion: string;
  activationCode: string;
  activationName: string;
  category: string;
  status: RescueMapMappingStatus;
  eventUtc: string;
  activatedUtc: string;
  lastCheckedAt: string;
  sourceUrl: string;
  situationUrl: string;
  productsUrl: string;
  /** POINT WKT in (lng lat) order; the (bounded) extent of the activation. */
  centroidWkt: string;
  /** POLYGON WKT in (lng lat) order; always a closed ring. */
  extentWkt: string;
  imagery: {
    comparisonState: RescueMapComparisonState;
    before: RescueMapImageryLayer | null;
    after: RescueMapImageryLayer | null;
    reference: RescueMapReferenceLayer;
  };
  aois: RescueMapMappingAoi[];
}

/** Map view mode selected by the rescue-map UI. */
export type RescueMapMode = "map" | "reference" | "before" | "after";

// ---------------------------------------------------------------------------
// Incident snapshot
// ---------------------------------------------------------------------------

/** Authority tag attached to a source — open for upstream additions. */
export type RescueMapSourceAuthority =
  | "official-colombia"
  | "official-international"
  | "external-context"
  | string;

/** A single reference source backing the incident record. */
export interface RescueMapIncidentSource {
  id: string;
  label: BilingualLabel;
  url: string;
  authority: RescueMapSourceAuthority;
  role: string;
  publishedAt?: string;
  lastCheckedAt: string;
}

/**
 * Origin + aftershock depth context. The depth has both a primary value
 * (linked sources in `event.depthContext.primarySourceIds`) and an
 * `officialAlternativeKm` from the SGC technical update — both are kept
 * in the record so the UI can show the range without losing provenance.
 */
export interface RescueMapDepthContext {
  primarySourceIds: string[];
  officialAlternativeKm: number;
  officialAlternativeSourceId: string;
  note: BilingualLabel;
}

export interface RescueMapEventOrigin {
  title: BilingualLabel;
  originLocal: string;
  originUtc: string;
  magnitude: number;
  latitude: number;
  longitude: number;
  depthKm: number;
  depthContext: RescueMapDepthContext;
  reference: BilingualLabel;
  parameterSourceId: string;
  sourceEventId: string;
  usgsEventId: string;
}

/** Tsunami assessment bulletin. */
export type RescueMapTsunamiStatus = "no-threat" | string;

export interface RescueMapTsunamiAssessment {
  status: RescueMapTsunamiStatus;
  actionsRequired: boolean;
  issuedAt: string;
  summary: BilingualLabel;
  sourceId: string;
}

/** Status of the public damage layer published for the incident. */
export interface RescueMapPublicDamageLayer {
  status: string;
  summary: BilingualLabel;
}

/** Pointer to the EMSR mapping snapshot from the incident record. */
export interface RescueMapMappingReference {
  activationCode: string;
  status: string;
  /** Relative path under `/data/incidents/` to the mapping snapshot. */
  mapSnapshot: string;
  summary: BilingualLabel;
}

/** A single line in the situational summary. */
export interface RescueMapSituationNote extends BilingualLabel {
  sourceIds?: string[];
}

export interface RescueMapSituation {
  known: RescueMapSituationNote[];
  unconfirmed: RescueMapSituationNote[];
  unknown: RescueMapSituationNote[];
}

/** A single safety advisory. */
export type RescueMapSafetyAdvisory = BilingualLabel;

/** A single operational priority carried by the incident. */
export interface RescueMapOperationalPriority {
  id: string;
  title: BilingualLabel;
  detail: BilingualLabel;
}

/** Privacy policy shipped with the incident record. */
export interface RescueMapPrivacy {
  personalDataPublished: boolean;
  exactHouseholdLocationsPublished: boolean;
  policy: BilingualLabel;
}

/** Incident lifecycle status. Open for upstream additions. */
export type RescueMapIncidentStatus = "activated-holding-bulletin" | string;

/**
 * Top-level incident record. Closed at the top level so missing fields are
 * caught by the type checker.
 */
export interface RescueMapIncident {
  schemaVersion: string;
  incidentId: string;
  slug: string;
  country: BilingualLabel;
  status: RescueMapIncidentStatus;
  statusLabel: BilingualLabel;
  activatedAt: string;
  lastVerifiedAt: string;
  verificationScope: BilingualLabel;
  event: RescueMapEventOrigin;
  tsunami: RescueMapTsunamiAssessment;
  publicDamageLayer: RescueMapPublicDamageLayer;
  mapping: RescueMapMappingReference;
  situation: RescueMapSituation;
  safety: RescueMapSafetyAdvisory[];
  operationalPriorities: RescueMapOperationalPriority[];
  sourcePolicy: BilingualLabel;
  sources: RescueMapIncidentSource[];
  privacy: RescueMapPrivacy;
  updatePolicy: BilingualLabel;
}

// ---------------------------------------------------------------------------
// Future public-layer types (verified needs + aggregated availability)
//
// These describe the *aggregate* surface the `/mapa-de-rescate` page will
// eventually show on top of the static data. They are decoupled from the
// upload/private surfaces so the public UI never has to reach into private
// fields just to render a chip. No PII and no sample records are carried.
// ---------------------------------------------------------------------------

/** Category of a verified need. Open for upstream additions. */
export type RescueMapNeedCategory =
  | "debris"
  | "health"
  | "water"
  | "food"
  | "transport"
  | "shelter"
  | "other"
  | string;

/** Urgency band for a verified need. */
export type RescueMapNeedUrgency = "low" | "medium" | "high" | "critical";

export type RescueMapNeedStatus = "open" | "assigned" | "resolved";
export type RescueMapVerificationStatus =
  | "unverified"
  | "in-review"
  | "verified"
  | "rejected";

/**
 * A need that has been verified by a maintainer against an official source.
 *
 * `lat`/`lng` describe the *center of the affected area*, never a household
 * or individual location. `quantity` and `unit` are positive when known
 * and `null` otherwise.
 */
export interface RescueMapVerifiedNeed {
  id: string;
  category: RescueMapNeedCategory;
  urgency: RescueMapNeedUrgency;
  label: BilingualLabel;
  /** Public zone label; never a household address. */
  zone: BilingualLabel;
  /** Optional reduced-precision coordinate suitable for public display. */
  approximateLocation: { lat: number; lng: number; precisionKm: number } | null;
  affectedPeople: number | null;
  verificationStatus: RescueMapVerificationStatus;
  source: { label: BilingualLabel; url: string | null };
  updatedAt: string;
  requiredSkillsOrResources: BilingualLabel[];
  status: RescueMapNeedStatus;
}

/** Kind of resource whose availability is being aggregated. */
export type RescueMapResourceKind =
  | "volunteers"
  | "usar-teams"
  | "medical-personnel"
  | "shelter-beds"
  | "vehicles"
  | "generators"
  | string;

export interface RescueMapVolunteerCapability {
  id: string;
  approximateZone: BilingualLabel;
  skills: string[];
  availability: "available" | "limited" | "unavailable";
  capacity: number | null;
  transport: "none" | "motorcycle" | "car" | "truck" | "other";
  status: "active" | "paused" | "inactive";
  operationalConstraints: string[];
}

/**
 * Aggregated availability of a resource kind in a named area. The aggregate
 * is the *only* shape the public UI is allowed to show — the upstream data
 * may carry individual records, but those must never reach the public layer.
 *
 * `totalUpperBound` is set when the source publishes a conservative lower
 * bound (e.g. "al menos N voluntarios") so the UI can render `≥ N` instead
 * of a misleading exact count.
 */
export interface RescueMapResourceAvailability {
  kind: RescueMapResourceKind;
  total: number;
  totalUpperBound?: number;
  aggregateAreaLabel: BilingualLabel;
  refreshedAt: string;
}

// ---------------------------------------------------------------------------
// POLYGON WKT parser
// ---------------------------------------------------------------------------

/**
 * Lightweight POLYGON WKT parser. Converts the WKT (lng lat) order into
 * Leaflet's (lat lng) order, returning an array of rings (the first ring is
 * the exterior, subsequent rings are holes).
 *
 * Accepted shapes:
 *  - `POLYGON ((x1 y1, x2 y2, ..., x1 y1))` — single ring, closed
 *  - `POLYGON ((x1 y1, ..., x1 y1), (h1, h2, ..., h1))` — exterior + holes
 *  - `POLYGON EMPTY` — empty polygon (returns `[]`)
 *
 * Throws on malformed input. Callers that source the WKT from somewhere
 * untrusted should wrap the call in a try/catch or validate with
 * `isPolygonWkt` first.
 *
 * Coordinate pairs are parsed into finite numbers; `NaN`, `Infinity`, and
 * `-Infinity` all throw because they cannot be drawn on a Leaflet map.
 */
export function parsePolygonWkt(wkt: string): [number, number][][] {
  const trimmed = wkt.trim();
  if (trimmed === "POLYGON EMPTY") return [];

  const match = /^POLYGON\s*\(\s*(.*?)\s*\)\s*$/i.exec(trimmed);
  if (!match) {
    throw new Error(`parsePolygonWkt: not a POLYGON WKT string: ${wkt}`);
  }

  const body = match[1] ?? "";
  if (!body) {
    throw new Error(`parsePolygonWkt: empty POLYGON body: ${wkt}`);
  }

  // Split into rings on a `), (` boundary. The body starts with `(` and ends
  // with `)`, so each segment is `<x y, x y, ...>`.
  const ringSegments = body
    .split(/\)\s*,\s*\(/)
    .map((segment) => segment.replace(/^\(/, "").replace(/\)$/, "").trim())
    .filter((segment) => segment.length > 0);

  if (ringSegments.length === 0) {
    throw new Error(`parsePolygonWkt: POLYGON has no rings: ${wkt}`);
  }

  const rings: [number, number][][] = ringSegments.map((segment) => {
    const pairs = segment.split(/\s*,\s*/);
    return pairs.map((pair) => {
      const parts = pair.trim().split(/\s+/);
      if (parts.length !== 2) {
        throw new Error(
          `parsePolygonWkt: coordinate pair is not "x y": ${pair} (in ${wkt})`,
        );
      }
      const lng = Number(parts[0]);
      const lat = Number(parts[1]);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        throw new Error(
          `parsePolygonWkt: non-finite coordinate in pair: ${pair} (in ${wkt})`,
        );
      }
      // Leaflet uses [lat, lng]; WKT is (lng lat).
      return [lat, lng] as [number, number];
    });
  });

  // A valid exterior ring has at least 4 vertices (the last repeats the first).
  const exterior = rings[0] ?? [];
  if (exterior.length < 4) {
    throw new Error(
      `parsePolygonWkt: exterior ring has fewer than 4 vertices: ${wkt}`,
    );
  }
  const first = exterior[0];
  const last = exterior[exterior.length - 1];
  if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) {
    throw new Error(`parsePolygonWkt: exterior ring is not closed: ${wkt}`);
  }

  return rings;
}

// ---------------------------------------------------------------------------
// Runtime shape guards
// ---------------------------------------------------------------------------

function isBilingualLabel(value: unknown): value is BilingualLabel {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.es === "string" && typeof candidate.en === "string";
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isMappingImage(value: unknown): value is RescueMapMappingImage {
  if (typeof value !== "object" || value === null) return false;
  const image = value as Record<string, unknown>;
  return (
    typeof image.uuid === "string" &&
    typeof image.sensorType === "string" &&
    typeof image.sensor === "string" &&
    typeof image.resolutionClass === "string" &&
    typeof image.acquisitionUtc === "string" &&
    (typeof image.fileName === "string" || image.fileName === null)
  );
}

function isMappingProduct(value: unknown): value is RescueMapMappingProduct {
  if (typeof value !== "object" || value === null) return false;
  const product = value as Record<string, unknown>;
  return (
    isFiniteNumber(product.id) &&
    typeof product.type === "string" &&
    isBilingualLabel(product.typeLabel) &&
    typeof product.monitoring === "boolean" &&
    typeof product.feasible === "boolean" &&
    (typeof product.expectedDeliveryUtc === "string" ||
      product.expectedDeliveryUtc === null) &&
    typeof product.statusCode === "string" &&
    typeof product.status === "string" &&
    Array.isArray(product.images) &&
    product.images.every(isMappingImage)
  );
}

function isMappingAoi(value: unknown): value is RescueMapMappingAoi {
  if (typeof value !== "object" || value === null) return false;
  const aoi = value as Record<string, unknown>;
  return (
    typeof aoi.id === "string" &&
    isFiniteNumber(aoi.number) &&
    isBilingualLabel(aoi.name) &&
    isPolygonWkt(aoi.extentWkt) &&
    (typeof aoi.blpUrl === "string" || aoi.blpUrl === null) &&
    Array.isArray(aoi.products) &&
    aoi.products.every(isMappingProduct)
  );
}

function isReferenceLayer(value: unknown): value is RescueMapReferenceLayer {
  if (typeof value !== "object" || value === null) return false;
  const layer = value as Record<string, unknown>;
  return (
    layer.role === "visual-reference-only" &&
    typeof layer.urlTemplate === "string" &&
    isFiniteNumber(layer.minZoom) &&
    isFiniteNumber(layer.maxZoom) &&
    typeof layer.source === "string" &&
    typeof layer.attribution === "string" &&
    isBilingualLabel(layer.limitations)
  );
}

function isTemporalLayer(
  value: unknown,
  role: RescueMapImageryRole,
): value is RescueMapImageryLayer {
  if (typeof value !== "object" || value === null) return false;
  const layer = value as Record<string, unknown>;
  return (
    layer.role === role &&
    typeof layer.urlTemplate === "string" &&
    isFiniteNumber(layer.minZoom) &&
    isFiniteNumber(layer.maxZoom) &&
    typeof layer.source === "string" &&
    typeof layer.attribution === "string" &&
    typeof layer.acquisitionUtc === "string" &&
    typeof layer.license === "string" &&
    isBilingualLabel(layer.limitations)
  );
}

/** Cheap syntactic check that a value looks like a POLYGON WKT. */
export function isPolygonWkt(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  if (/^POLYGON\s+EMPTY$/i.test(trimmed)) return true;
  return /^POLYGON\s*\(\s*\(.*\)\s*\)\s*$/i.test(trimmed);
}

/**
 * Cheap syntactic check that a value looks like a WKT string. The mapping
 * snapshot uses POINT for `centroidWkt` and POLYGON for `extentWkt`; the
 * guard is permissive on the geometry type because the parser only handles
 * POLYGON, but the shape guard cares that the centroid is at least a
 * well-formed WKT keyword string.
 */
function isWkt(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^(POINT|POLYGON|MULTIPOLYGON|LINESTRING|MULTILINESTRING)\b/i.test(
    value.trim(),
  );
}

/**
 * Minimal shape guard for a downloaded mapping snapshot. The guard is
 * deliberately permissive — it checks the *required* top-level fields and
 * the array shape of `aois`, not every nested element. Field-level validation
 * for products/images still happens on access in the UI.
 */
export function isRescueMapMappingSnapshot(
  value: unknown,
): value is RescueMapMappingSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.schemaVersion !== "string") return false;
  if (typeof candidate.activationCode !== "string") return false;
  if (typeof candidate.activationName !== "string") return false;
  if (typeof candidate.category !== "string") return false;
  if (typeof candidate.status !== "string") return false;
  if (typeof candidate.eventUtc !== "string") return false;
  if (typeof candidate.activatedUtc !== "string") return false;
  if (typeof candidate.lastCheckedAt !== "string") return false;
  if (typeof candidate.sourceUrl !== "string") return false;
  if (typeof candidate.situationUrl !== "string") return false;
  if (typeof candidate.productsUrl !== "string") return false;
  if (!isWkt(candidate.centroidWkt)) return false;
  if (!isPolygonWkt(candidate.extentWkt)) return false;
  if (typeof candidate.imagery !== "object" || candidate.imagery === null) {
    return false;
  }
  const imagery = candidate.imagery as Record<string, unknown>;
  if (typeof imagery.comparisonState !== "string") return false;
  if (!isReferenceLayer(imagery.reference)) return false;
  if (imagery.before !== null && !isTemporalLayer(imagery.before, "before")) {
    return false;
  }
  if (imagery.after !== null && !isTemporalLayer(imagery.after, "after")) {
    return false;
  }
  return Array.isArray(candidate.aois) && candidate.aois.every(isMappingAoi);
}

/**
 * Minimal shape guard for a downloaded incident record. Mirrors
 * `isRescueMapMappingSnapshot` in scope: top-level required fields plus the
 * shape of nested objects, not deep validation of every source/safety item.
 */
export function isRescueMapIncident(value: unknown): value is RescueMapIncident {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.schemaVersion !== "string") return false;
  if (typeof candidate.incidentId !== "string") return false;
  if (typeof candidate.slug !== "string") return false;
  if (!isBilingualLabel(candidate.country)) return false;
  if (typeof candidate.status !== "string") return false;
  if (!isBilingualLabel(candidate.statusLabel)) return false;
  if (typeof candidate.activatedAt !== "string") return false;
  if (typeof candidate.lastVerifiedAt !== "string") return false;
  if (!isBilingualLabel(candidate.verificationScope)) return false;
  if (typeof candidate.event !== "object" || candidate.event === null) {
    return false;
  }
  const event = candidate.event as Record<string, unknown>;
  if (
    !isBilingualLabel(event.title) ||
    typeof event.originLocal !== "string" ||
    typeof event.originUtc !== "string" ||
    !isFiniteNumber(event.magnitude) ||
    !isFiniteNumber(event.latitude) ||
    !isFiniteNumber(event.longitude) ||
    !isFiniteNumber(event.depthKm) ||
    !isBilingualLabel(event.reference)
  ) {
    return false;
  }
  if (typeof candidate.tsunami !== "object" || candidate.tsunami === null) {
    return false;
  }
  const tsunami = candidate.tsunami as Record<string, unknown>;
  if (
    typeof tsunami.status !== "string" ||
    typeof tsunami.actionsRequired !== "boolean" ||
    typeof tsunami.issuedAt !== "string" ||
    !isBilingualLabel(tsunami.summary)
  ) {
    return false;
  }
  if (
    typeof candidate.publicDamageLayer !== "object" ||
    candidate.publicDamageLayer === null
  ) {
    return false;
  }
  const damageLayer = candidate.publicDamageLayer as Record<string, unknown>;
  if (
    typeof damageLayer.status !== "string" ||
    !isBilingualLabel(damageLayer.summary)
  ) {
    return false;
  }
  if (typeof candidate.mapping !== "object" || candidate.mapping === null) {
    return false;
  }
  if (typeof candidate.situation !== "object" || candidate.situation === null) {
    return false;
  }
  if (!Array.isArray(candidate.safety)) return false;
  if (!Array.isArray(candidate.operationalPriorities)) return false;
  if (!isBilingualLabel(candidate.sourcePolicy)) return false;
  if (
    !Array.isArray(candidate.sources) ||
    !candidate.sources.every((source) => {
      if (typeof source !== "object" || source === null) return false;
      const item = source as Record<string, unknown>;
      return (
        typeof item.id === "string" &&
        isBilingualLabel(item.label) &&
        typeof item.url === "string" &&
        typeof item.authority === "string" &&
        typeof item.role === "string" &&
        typeof item.lastCheckedAt === "string"
      );
    })
  ) {
    return false;
  }
  if (typeof candidate.privacy !== "object" || candidate.privacy === null) {
    return false;
  }
  if (!isBilingualLabel(candidate.updatePolicy)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the first product of an AOI, or `null` when the AOI carries no
 * products. The mapping UI uses this to render a stable "primary" chip per
 * AOI without needing to know how the upstream stacks GRA/GRM.
 */
export function firstProduct(
  aoi: RescueMapMappingAoi,
): RescueMapMappingProduct | null {
  return aoi.products[0] ?? null;
}
