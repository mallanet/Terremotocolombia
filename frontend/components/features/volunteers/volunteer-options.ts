import type { VolunteerOfferType } from "@/hooks/volunteers";

export interface OfferOption {
  value: VolunteerOfferType;
  label: string;
  hint: string;
}

export const OFFER_OPTIONS: OfferOption[] = [
  {
    value: "persona",
    label: "Mi tiempo y habilidades",
    hint: "Voluntariado digital o en terreno",
  },
  {
    value: "insumos",
    label: "Insumos",
    hint: "Agua, alimentos no perecederos, kits de higiene, cobijas, carpas…",
  },
  {
    value: "dinero",
    label: "Donación monetaria",
    hint: "Fondo general o por rubro (ej. maquinaria, alimentación de brigadas)",
  },
  {
    value: "maquinaria",
    label: "Maquinaria o equipos",
    hint: "Retroexcavadoras, generadores, vehículos de carga, herramientas…",
  },
  {
    value: "transporte",
    label: "Transporte",
    hint: "Vehículos para personas o insumos, red de transportistas",
  },
];

export const DIGITAL_SKILLS = [
  "Verificación de datos",
  "Redes sociales",
  "Traducción",
  "Diseño y comunicación",
  "Soporte psicológico básico",
  "Soporte técnico",
] as const;

export const FIELD_ROLES = [
  "Logística",
  "Acopio",
  "Apoyo psicosocial",
  "Salud",
  "Evaluación estructural (ingeniero certificado)",
  "Cocina y alimentación",
  "Chofer con licencia",
  "Operador de maquinaria",
] as const;

export type YesNo = "" | "si" | "no";
export type PersonaMode = "" | "digital" | "terreno";

export interface BranchState {
  offerTypes: VolunteerOfferType[];
  personaMode: PersonaMode;
  digitalSkills: string[];
  crisisExperience: YesNo;
  fieldCity: string;
  rescueTraining: YesNo;
  fieldRole: string;
  ownVehicle: YesNo;
  offer: string;
}

export const EMPTY_BRANCH: BranchState = {
  offerTypes: [],
  personaMode: "",
  digitalSkills: [],
  crisisExperience: "",
  fieldCity: "",
  rescueTraining: "",
  fieldRole: "",
  ownVehicle: "",
  offer: "",
};
