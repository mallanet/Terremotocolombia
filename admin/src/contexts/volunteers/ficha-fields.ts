export type VolunteerRow = Record<string, unknown>;

export interface FichaField {
  key: string;
  label: string;
}

export interface FichaSection {
  title: string;
  fields: FichaField[];
}

export const OFFER_TYPE_LABELS: Record<string, string> = {
  persona: "Su tiempo y habilidades",
  insumos: "Insumos",
  dinero: "Donación monetaria",
  maquinaria: "Maquinaria o equipos",
  transporte: "Transporte",
};

export function fichaFieldKeys(): string[] {
  return fichaSections().flatMap((section) => section.fields.map((field) => field.key));
}

export function fichaSections(): FichaSection[] {
  return [
    {
      title: "Contacto",
      fields: [
        { key: "contact", label: "Contacto" },
        { key: "zone", label: "Ciudad / país" },
        { key: "availability", label: "Disponibilidad" },
      ],
    },
    {
      title: "Qué ofrece",
      fields: [
        { key: "offerTypes", label: "Tipos de ayuda" },
        { key: "offer", label: "Detalle" },
        { key: "digitalSkills", label: "Habilidades" },
      ],
    },
    {
      title: "Campo",
      fields: [
        { key: "fieldCity", label: "Ciudad de campo" },
        { key: "fieldRole", label: "Rol" },
        { key: "rescueTraining", label: "Formación rescate" },
        { key: "crisisExperience", label: "Experiencia crisis" },
        { key: "ownVehicle", label: "Vehículo propio" },
      ],
    },
    {
      title: "Interno",
      fields: [
        { key: "source", label: "Origen" },
        { key: "notes", label: "Notas" },
        { key: "createdAt", label: "Alta" },
        { key: "updatedAt", label: "Actualizado" },
      ],
    },
  ];
}
