/**
 * Datos del evento de referencia para la página de "riesgo sísmico".
 * Colombia: terremoto del Eje Cafetero 1999 (M6.2) como evento de referencia
 * y localidades en zonas de alta amenaza sísmica según el mapa de amenaza
 * del Servicio Geológico Colombiano. MMI/población son valores indicativos
 * de riesgo para la página de referencia — revísalos ante un evento real.
 */
import { deploymentConfig } from "@/lib/deployment-config";

export interface SeismicRiskEventMeta {
  title: string;
  eventId: string;
  occurredAt: string;
  source: string;
  sourceUrl: string;
}

/** Evento sísmico de referencia para Colombia: terremoto del Eje Cafetero 1999. */
export const SEISMIC_RISK_EVENT: SeismicRiskEventMeta = {
  title: `M6.2 — Terremoto del Eje Cafetero 1999 · evento de referencia (${deploymentConfig.disasterName})`,
  eventId: "eje-cafetero-1999",
  occurredAt: "1999-01-25T18:19:00Z",
  source: "USGS · Servicio Geológico Colombiano",
  sourceUrl: "https://www.sgc.gov.co/",
};

export type SeismicRiskLevel = "critical" | "high";

export interface SeismicRiskCity {
  rank: number;
  city: string;
  state: string;
  level: SeismicRiskLevel;
  mmi: number;
  population: number;
  lat: number;
  lng: number;
}

/** Localidades colombianas en zonas de alta amenaza sísmica (ref: mapa de amenaza SGC). */
export const SEISMIC_RISK_CITIES: SeismicRiskCity[] = [
  {
    rank: 1,
    city: "Bucaramanga",
    state: "Santander",
    level: "critical",
    mmi: 7.5,
    population: 580000,
    lat: 7.1193,
    lng: -73.1227,
  },
  {
    rank: 2,
    city: "Armenia",
    state: "Quindío",
    level: "critical",
    mmi: 7.5,
    population: 300000,
    lat: 4.5389,
    lng: -75.6811,
  },
  {
    rank: 3,
    city: "Cúcuta",
    state: "Norte de Santander",
    level: "high",
    mmi: 7.0,
    population: 690000,
    lat: 7.8939,
    lng: -72.5078,
  },
  {
    rank: 4,
    city: "Pereira",
    state: "Risaralda",
    level: "high",
    mmi: 6.8,
    population: 480000,
    lat: 4.8133,
    lng: -75.6961,
  },
  {
    rank: 5,
    city: "Pasto",
    state: "Nariño",
    level: "high",
    mmi: 6.8,
    population: 310000,
    lat: 1.2136,
    lng: -77.2811,
  },
  {
    rank: 6,
    city: "Popayán",
    state: "Cauca",
    level: "high",
    mmi: 6.5,
    population: 280000,
    lat: 2.4448,
    lng: -76.6147,
  },
];

export interface SeismicRiskAoi {
  name: string;
  area: string;
  criticalBuildings: number;
  basis: string;
  center: [number, number];
  radiusKm: number;
}

/** Áreas de interés sísmico en Colombia (ref: SGC). */
export const SEISMIC_RISK_AOIS: SeismicRiskAoi[] = [
  {
    name: "Eje Cafetero (Armenia–Pereira–Manizales)",
    area: "Sistema de fallas de Romeral",
    criticalBuildings: 12,
    basis: "Sismicidad histórica SGC: terremoto del Quindío 1999 (M6.2).",
    center: [4.55, -75.68],
    radiusKm: 60,
  },
  {
    name: "Bucaramanga y área metropolitana",
    area: "Nido sísmico de Bucaramanga",
    criticalBuildings: 10,
    basis: "Nido de Bucaramanga: mayor concentración de sismicidad de Colombia (SGC).",
    center: [7.12, -73.12],
    radiusKm: 50,
  },
];
