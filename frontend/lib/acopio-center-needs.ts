export const ACOPIO_ACCEPT_OPTIONS = [
  { value: "food", label: "Alimentos" },
  { value: "water", label: "Agua" },
  { value: "hygiene", label: "Higiene / aseo" },
  { value: "blankets", label: "Cobijas / colchonetas" },
  { value: "clothing", label: "Ropa" },
  { value: "medicines", label: "Medicinas" },
  { value: "medical_supplies", label: "Insumos médicos" },
  { value: "tools", label: "Herramientas" },
  { value: "blood", label: "Sangre" },
  { value: "shelter", label: "Refugio para familias" },
] as const;

export function composeCenterNeeds(input: {
  accepts: string[];
  schedule: string;
  contact: string;
  notes: string;
}): string {
  const lines: string[] = [];
  if (input.accepts.length) {
    const labels = ACOPIO_ACCEPT_OPTIONS.filter((o) =>
      input.accepts.includes(o.value),
    ).map((o) => o.label);
    if (labels.length) lines.push(`Reciben: ${labels.join(", ")}`);
  }
  if (input.schedule.trim()) lines.push(`Horario: ${input.schedule.trim()}`);
  if (input.contact.trim()) lines.push(`Contacto: ${input.contact.trim()}`);
  if (input.notes.trim()) lines.push(input.notes.trim());
  return lines.join("\n").slice(0, 1000);
}
