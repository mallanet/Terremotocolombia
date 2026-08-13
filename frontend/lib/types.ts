export type ReportType =
  | "critical"
  | "need"
  | "supplies"
  | "shelter"
  | "nopower"
  | "missing"
  | "building"
  | "starlink";

export interface EmergencyReport {
  id: string;
  type: ReportType;
  lat: number;
  lng: number;
  place: string;
  affected: number;
  needs: string;
  photoUrl: string | null;
  confirmations: number;
  createdAt: number;
}

export interface Earthquake {
  id: string;
  magnitude: number | null;
  place: string;
  lat: number;
  lng: number;
  depthKm: number | null;
  alert: string | null;
  tsunami: boolean;
  sig: number | null;
  occurredAt: number;
}

export interface EarthquakeSync {
  fetchedAt: number | null;
}

export interface EarthquakesListResponse {
  earthquakes: Earthquake[];
  sync: EarthquakeSync;
}

export type NewReport = Omit<
  EmergencyReport,
  "id" | "createdAt" | "photoUrl" | "confirmations"
> & {
  photo?: string | null;
};

export const REPORT_TYPES: Record<
  ReportType,
  {
    label: string;
    color: string;
    emoji: string;
    icon: string;
    description: string;
  }
> = {
  critical: {
    label: "Emergencia Crítica",
    color: "#dc2626",
    emoji: "🔴",
    icon: "🆘",
    description:
      "Personas atrapadas, heridos de gravedad o colapso estructural inminente. Prioridad máxima de rescate.",
  },
  need: {
    label: "Solicitar ayuda",
    color: "#ea580c",
    emoji: "🟠",
    icon: "🙋",
    description:
      "Pedidos de gente que necesita agua, comida, medicinas, refugio o transporte. No es una oferta.",
  },
  supplies: {
    label: "Tengo suministros",
    color: "#eab308",
    emoji: "🟡",
    icon: "📦",
    description:
      "Gente que tiene y puede entregar agua, alimentos, cobijas, herramientas u otros insumos.",
  },
  shelter: {
    label: "Centro de Acopio / Refugio",
    color: "#16a34a",
    emoji: "🟢",
    icon: "🏠",
    description:
      "Punto verificado y habilitado para recibir donaciones físicas o resguardar familias (Refugio seguro).",
  },
  nopower: {
    label: "Zona estable (sin electricidad)",
    color: "#0ea5e9",
    emoji: "🔵",
    icon: "💡",
    description:
      "Zona sin daños graves y segura, pero sin servicio eléctrico (y posiblemente sin señal). Útil para saber qué sectores están bien.",
  },
  missing: {
    label: "Se busca (persona)",
    color: "#9333ea",
    emoji: "🟣",
    icon: "🔍",
    description:
      "Búsqueda de una persona desaparecida. Indica su última ubicación conocida y una descripción para ayudar a localizarla.",
  },
  building: {
    label: "Edificación",
    color: "#78350f",
    emoji: "🟤",
    icon: "🏢",
    description:
      "Registro fotográfico del estado de un edificio o construcción. Útil para que ingenieros y autoridades evalúen daños estructurales.",
  },
  starlink: {
    label: "Antena Starlink",
    color: "#0f172a",
    emoji: "⚫",
    icon: "🛰️",
    description:
      "Punto con antena Starlink o internet satelital disponible para la comunidad. Indica la ubicación exacta y si el acceso es público.",
  },
};

export const REPORT_TYPE_KEYS = Object.keys(REPORT_TYPES) as ReportType[];

export const MAP_REPORT_TYPE_KEYS = REPORT_TYPE_KEYS.filter(
  (key): key is ReportType => key !== "critical",
);

export interface MissingPerson {
  id: string;
  name: string;
  age: number | null;
  nationality?: string;
  description: string;
  lastSeen: string;
  contact: string;
  photoUrl: string | null;
  status?: "active" | "found";
  resolutionNote?: string | null;
  resolutionPhotoUrl?: string | null;
  resolvedAt?: number | null;
  createdAt: number;
}
