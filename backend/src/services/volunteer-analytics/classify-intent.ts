/**
 * Pure volunteer intent classifier (V1).
 *
 * Frozen taxonomy from canvas `voluntarios-analisis` + `other`/`unclassified`.
 * Priority: field_role → offer_types → digital skills → free-text offer.
 * One dominant IntentKey per volunteer.
 */

export type IntentKey =
  | "digital_remote"
  | "acopio"
  | "field_logistics"
  | "clinical_health"
  | "general_hands"
  | "cooking_food"
  | "structural_eval"
  | "psychosocial"
  | "transport_driver"
  | "donation"
  | "other";

export type IntentTaxonomyEntry = { key: IntentKey; label: string };

/** Frozen V1 labels — must stay aligned with canvas `intentRows`. */
export const INTENT_TAXONOMY: readonly IntentTaxonomyEntry[] = [
  { key: "digital_remote", label: "Solo digital / remoto" },
  { key: "acopio", label: "Acopio / centros" },
  { key: "field_logistics", label: "Logística de campo" },
  { key: "clinical_health", label: "Salud clínica" },
  { key: "general_hands", label: "Manos generales (sin rol)" },
  { key: "cooking_food", label: "Cocina y alimentación" },
  { key: "structural_eval", label: "Evaluación estructural" },
  { key: "psychosocial", label: "Apoyo psicosocial" },
  { key: "transport_driver", label: "Transporte / chofer" },
  { key: "donation", label: "Donación (dinero/especie)" },
  { key: "other", label: "Sin clasificar" },
] as const;

const LABEL_BY_KEY: Record<IntentKey, string> = Object.fromEntries(
  INTENT_TAXONOMY.map((t) => [t.key, t.label]),
) as Record<IntentKey, string>;

export type ClassifyInput = {
  fieldRole?: string | null;
  offerTypes?: unknown;
  digitalSkills?: unknown;
  offer?: string | null;
};

export type ClassifyResult = { key: IntentKey; label: string };

export type ModalityKey = "campo" | "digital" | "unclear";
export type FormCohortKey = "structured" | "intermediate" | "basic";

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function asStringList(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string").map(norm);
  }
  if (typeof value === "string") return [norm(value)];
  return [];
}

const FIELD_ROLE_MAP: Record<string, IntentKey> = {
  acopio: "acopio",
  centros: "acopio",
  centro_acopio: "acopio",
  logistica: "field_logistics",
  logistica_campo: "field_logistics",
  campo: "field_logistics",
  salud: "clinical_health",
  medico: "clinical_health",
  clinica: "clinical_health",
  cocina: "cooking_food",
  alimentacion: "cooking_food",
  evaluacion_estructural: "structural_eval",
  estructural: "structural_eval",
  psicosocial: "psychosocial",
  psicologico: "psychosocial",
  transporte: "transport_driver",
  chofer: "transport_driver",
  conductor: "transport_driver",
  general: "general_hands",
  manos: "general_hands",
  manos_generales: "general_hands",
  digital: "digital_remote",
  remoto: "digital_remote",
};

const OFFER_TYPE_MAP: Record<string, IntentKey> = {
  transporte: "transport_driver",
  donacion: "donation",
  dinero: "donation",
  especie: "donation",
  digital: "digital_remote",
  remoto: "digital_remote",
};

const FREE_TEXT_RULES: Array<{ key: IntentKey; patterns: RegExp[] }> = [
  { key: "acopio", patterns: [/\bacopio\b/, /\bcentros?\b/] },
  { key: "field_logistics", patterns: [/\blogistic/, /\bcampo\b/] },
  {
    key: "clinical_health",
    patterns: [/\bmedic/, /\bsalud\b/, /\bclinic/, /\benfermer/],
  },
  { key: "cooking_food", patterns: [/\bcocin/, /\baliment/, /\bcomida\b/] },
  {
    key: "structural_eval",
    patterns: [/\bestructur/, /\bingenier/, /\bevaluac/],
  },
  { key: "psychosocial", patterns: [/\bpsico/, /\bemocional/] },
  {
    key: "transport_driver",
    patterns: [/\btransport/, /\bchofer\b/, /\bconductor\b/, /\bvehiculo\b/],
  },
  { key: "donation", patterns: [/\bdonac/, /\bdinero\b/, /\bespecie\b/] },
  { key: "digital_remote", patterns: [/\bdigital\b/, /\bremoto\b/, /\bonline\b/] },
  { key: "general_hands", patterns: [/\bmanos\b/, /\bgeneral\b/] },
];

function result(key: IntentKey): ClassifyResult {
  return { key, label: LABEL_BY_KEY[key] };
}

/**
 * Assign one dominant intent for a volunteer row (classification columns only).
 */
export function classifyVolunteerIntent(input: ClassifyInput): ClassifyResult {
  const role = input.fieldRole ? norm(input.fieldRole) : "";
  if (role && FIELD_ROLE_MAP[role]) {
    return result(FIELD_ROLE_MAP[role]!);
  }

  const offerTypes = asStringList(input.offerTypes);
  for (const t of offerTypes) {
    if (OFFER_TYPE_MAP[t]) return result(OFFER_TYPE_MAP[t]!);
  }

  const skills = asStringList(input.digitalSkills);
  if (skills.length > 0) {
    return result("digital_remote");
  }

  const offerText = input.offer ? norm(input.offer) : "";
  if (offerText) {
    for (const rule of FREE_TEXT_RULES) {
      if (rule.patterns.some((re) => re.test(offerText))) {
        return result(rule.key);
      }
    }
  }

  return result("other");
}

function hasNonEmptyRole(fieldRole?: string | null): boolean {
  return Boolean(fieldRole && fieldRole.trim());
}

function hasListSignal(value: unknown): boolean {
  return asStringList(value).length > 0;
}

function hasDigitalOfferType(offerTypes: unknown): boolean {
  return asStringList(offerTypes).some((t) => OFFER_TYPE_MAP[t] === "digital_remote");
}

/**
 * Mutually exclusive modality: campo = field_role set;
 * digital = !role ∧ (skills ∨ digital offer_types ∨ intent digital_remote);
 * unclear = else.
 */
export function classifyModality(input: ClassifyInput): ModalityKey {
  if (hasNonEmptyRole(input.fieldRole)) return "campo";

  const hasSkills = hasListSignal(input.digitalSkills);
  const digitalOffer = hasDigitalOfferType(input.offerTypes);
  const intentDigital =
    classifyVolunteerIntent({
      fieldRole: null,
      offerTypes: input.offerTypes,
      digitalSkills: input.digitalSkills,
      offer: input.offer,
    }).key === "digital_remote";

  if (hasSkills || digitalOffer || intentDigital) return "digital";
  return "unclear";
}

/**
 * Form cohort: structured = field_role set;
 * intermediate = !role ∧ (offerTypes ∨ skills);
 * basic = else.
 */
export function classifyFormCohort(input: ClassifyInput): FormCohortKey {
  if (hasNonEmptyRole(input.fieldRole)) return "structured";
  if (hasListSignal(input.offerTypes) || hasListSignal(input.digitalSkills)) {
    return "intermediate";
  }
  return "basic";
}
