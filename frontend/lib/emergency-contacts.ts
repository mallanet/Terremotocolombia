/**
 * Directorio de teléfonos de emergencia mostrado en /telefonos y en la sección
 * "Teléfonos de emergencia" de la home.
 *
 * Colombia: estructura oficial 1XY (Resolución CRC 4972/2016) — 123 único
 * nacional, 111 desastres, 125 ambulancia, 132 Cruz Roja, 119 bomberos,
 * 144 Defensa Civil, 112 Policía, 106 apoyo psicosocial.
 */

export interface EmergencyContact {
  name: string;
  numbers: string[];
}

export interface EmergencyContactGroup {
  title: string;
  icon: string;
  contacts: EmergencyContact[];
}

export const EMERGENCY_CONTACT_GROUPS: EmergencyContactGroup[] = [
  {
    title: "Emergencias (línea única nacional)",
    icon: "🚨",
    contacts: [
      { name: "Número Único de Emergencias", numbers: ["123"] },
      { name: "Atención de desastres", numbers: ["111"] },
    ],
  },
  {
    title: "Salud y rescate",
    icon: "🚑",
    contacts: [
      { name: "Ambulancia", numbers: ["125"] },
      { name: "Cruz Roja Colombiana", numbers: ["132"] },
    ],
  },
  {
    title: "Bomberos y protección civil",
    icon: "🚒",
    contacts: [
      { name: "Bomberos", numbers: ["119"] },
      { name: "Defensa Civil Colombiana", numbers: ["144"] },
    ],
  },
  {
    title: "Seguridad",
    icon: "👮",
    contacts: [{ name: "Policía Nacional", numbers: ["112"] }],
  },
  {
    title: "Apoyo psicosocial",
    icon: "💛",
    contacts: [
      { name: "Línea de ayuda e intervención en crisis", numbers: ["106"] },
    ],
  },
];
