import { fileToResizedDataUrl } from "@/lib/image-resize";
import type { ReportType } from "@/lib/types";

export { fileToResizedDataUrl };

type FieldCopy = {
  placeLabel: string;
  placePlaceholder: string;
  showAffected: boolean;
  affectedLabel: string;
  needsLabel: string;
  needsPlaceholder: string;
};

const DEFAULT_COPY: FieldCopy = {
  placeLabel: "Nombre o Dirección exacta del Edificio / Lugar",
  placePlaceholder: "Ej: Residencias El Parque, Torre B, Municipio Chacao",
  showAffected: true,
  affectedLabel: "Cantidad estimada de personas afectadas o atrapadas",
  needsLabel: "¿Qué se necesita con urgencia?",
  needsPlaceholder:
    "Sé específico: Equipos de rescate, paramédicos, agua potable, maquinaria pesada para escombros, medicinas",
};

const COPY_BY_TYPE: Partial<Record<ReportType, Partial<FieldCopy>>> = {
  need: {
    placeLabel: "Dónde lo necesitas",
    placePlaceholder: "Ej: barrio, conjunto o punto de encuentro",
    showAffected: true,
    affectedLabel: "Personas que necesitan ayuda",
    needsLabel: "¿Qué necesitas?",
    needsPlaceholder:
      "Agua, alimentos, medicinas, cobijas, transporte, refugio… sé específico",
  },
  supplies: {
    placeLabel: "Dónde están los suministros",
    placePlaceholder: "Ej: casa, acopio o punto de entrega",
    showAffected: false,
    needsLabel: "¿Qué ofreces?",
    needsPlaceholder:
      "Agua, alimentos no perecederos, cobijas, herramientas, transporte… cantidad si puedes",
  },
  nopower: {
    placeLabel: "Zona / Sector",
    placePlaceholder: "Ej: Urbanización La Trinidad, calle principal",
    showAffected: false,
    needsLabel: "Detalles de la zona",
    needsPlaceholder:
      "¿Desde cuándo sin luz? ¿Hay agua, señal, comercios abiertos? ¿Vías despejadas?",
  },
  missing: {
    placeLabel: "Última ubicación conocida",
    placePlaceholder: "Ej: visto por última vez cerca de la plaza de Chacao",
    affectedLabel: "¿Cuántas personas se buscan?",
    needsLabel: "Descripción de la persona",
    needsPlaceholder:
      "Nombre, edad, estatura, vestimenta, señas particulares y un contacto",
  },
  building: {
    placeLabel: "Nombre o dirección del edificio",
    placePlaceholder: "Ej: Torre Solymar, Av. Andrés Bello, La Candelaria",
    showAffected: false,
    needsLabel: "Estado estructural observado",
    needsPlaceholder:
      "Ej: grietas verticales en columnas del 1er piso, fachada inclinada, vidrios rotos. Anexa foto para que ingenieros lo evalúen.",
  },
  starlink: {
    placeLabel: "Ubicación de la antena",
    placePlaceholder:
      "Ej: refugio comunitario en Chacao, iglesia San José, plaza principal",
    showAffected: false,
    needsLabel: "Detalles de conectividad",
    needsPlaceholder:
      "¿WiFi abierto? ¿Horario? ¿Cuántas personas puede atender? Red/contraseña si aplica.",
  },
};

export function copyFor(type: ReportType): FieldCopy {
  return { ...DEFAULT_COPY, ...COPY_BY_TYPE[type] };
}

export function reportFormTitle(type: ReportType): string {
  if (type === "need") return "Solicitar ayuda";
  if (type === "supplies") return "Ofrecer suministros";
  return "Reportar información";
}

export function reportSubmitLabel(type: ReportType, submitting: boolean): string {
  if (submitting) return "Publicando…";
  if (type === "need") return "Publicar pedido";
  return "Publicar";
}

