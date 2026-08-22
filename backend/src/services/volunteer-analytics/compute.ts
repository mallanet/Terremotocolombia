/**
 * Pure aggregate builder for volunteer analytics (no DB I/O).
 */
import {
  classifyFormCohort,
  classifyModality,
  classifyVolunteerIntent,
  INTENT_TAXONOMY,
  type IntentKey,
} from "./classify-intent";
import type {
  CountBucket,
  FieldCapacity,
  FormCohorts,
  GeoBucket,
  HourBucket,
  IntentBucket,
  ModalityCounts,
  PipelineByIntentBucket,
  StatusBucket,
  VolunteerAnalyticsActions,
  VolunteerAnalyticsCallout,
  VolunteerAnalyticsResponse,
} from "./types";

/** Classification / grouping columns only — never name/contact/notes/ip. */
export type VolunteerAnalyticsRow = {
  status: string;
  fieldRole: string | null;
  offerTypes: unknown;
  digitalSkills: unknown;
  /** Used only for classification; never echoed into the response. */
  offer: string | null;
  fieldCity: string | null;
  availability: string | null;
  source: string | null;
  createdAt: number;
  ownVehicle?: boolean | null;
  rescueTraining?: boolean | null;
  crisisExperience?: boolean | null;
};

export type ComputeInput = {
  volunteers: VolunteerAnalyticsRow[];
  taskCount: number;
  assignmentCount: number;
  now: number;
  sinceMs?: number;
  sinceIso?: string;
};

/** Scarce intents for P0 — fixed canvas order: Salud → estructural → transporte → psicosocial. */
const SCARCE_INTENTS: readonly IntentKey[] = [
  "clinical_health",
  "structural_eval",
  "transport_driver",
  "psychosocial",
] as const;

/** Volume intents for P1. */
const VOLUME_INTENTS: readonly IntentKey[] = ["acopio", "field_logistics"] as const;

const EMPTY_FORM_COHORTS: FormCohorts = {
  structured: { total: 0, contacted: 0 },
  intermediate: { total: 0, contacted: 0 },
  basic: { total: 0, contacted: 0 },
};

const EMPTY_MODALITY: ModalityCounts = { campo: 0, digital: 0, unclear: 0 };

const EMPTY_FIELD_CAPACITY: FieldCapacity = { vehicle: 0, rescue: 0, crisis: 0 };

const BOGOTA_HOUR_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Bogota",
  hour: "numeric",
  hourCycle: "h23",
});

function bump(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function sortedCountBuckets(map: Map<string, number>): CountBucket[] {
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

function asStringList(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function labelByIntentKey(): Record<string, string> {
  return Object.fromEntries(INTENT_TAXONOMY.map((t) => [t.key, t.label]));
}

function bogotaWallHour(createdAtMs: number): number {
  const parts = BOGOTA_HOUR_FMT.formatToParts(new Date(createdAtMs));
  const hourPart = parts.find((p) => p.type === "hour");
  return Number(hourPart?.value ?? 0);
}

function emptyActions(taskCount: number): VolunteerAnalyticsActions {
  return {
    p0: {
      id: "contact-scarce",
      priority: "P0",
      title: "Contactar escasos",
      count: 0,
      breakdown: [],
    },
    p1: {
      id: "dispatch-volume",
      priority: "P1",
      title: "Despachar volumen",
      count: 0,
      tasks: taskCount,
      breakdown: [],
    },
    p2: {
      id: "remote-bank",
      priority: "P2",
      title: "Banco remoto",
      count: 0,
    },
  };
}

/**
 * Formula-driven action cards (Spanish titles fixed; counts from live aggregates).
 * NEVER hardcode canvas snapshot numbers (28/52/32).
 */
export function buildActions(opts: {
  pipelineByIntent: PipelineByIntentBucket[];
  intents: IntentBucket[];
  modality: ModalityCounts;
  tasks: number;
}): VolunteerAnalyticsActions {
  const labels = labelByIntentKey();
  const pendingByKey = new Map(opts.pipelineByIntent.map((p) => [p.key, p.pending]));
  const countByKey = new Map(opts.intents.map((i) => [i.key, i.count]));

  const scarceBreakdown = SCARCE_INTENTS.map((key) => ({
    key,
    label: labels[key] ?? key,
    pending: pendingByKey.get(key) ?? 0,
  }));
  const p0Count = scarceBreakdown.reduce((sum, b) => sum + b.pending, 0);

  const volumeBreakdown = VOLUME_INTENTS.map((key) => ({
    key,
    label: labels[key] ?? key,
    count: countByKey.get(key) ?? 0,
  }));
  const p1Count = volumeBreakdown.reduce((sum, b) => sum + b.count, 0);

  return {
    p0: {
      id: "contact-scarce",
      priority: "P0",
      title: "Contactar escasos",
      count: p0Count,
      breakdown: scarceBreakdown,
    },
    p1: {
      id: "dispatch-volume",
      priority: "P1",
      title: "Despachar volumen",
      count: p1Count,
      tasks: opts.tasks,
      breakdown: volumeBreakdown,
    },
    p2: {
      id: "remote-bank",
      priority: "P2",
      title: "Banco remoto",
      count: opts.modality.digital,
    },
  };
}

function buildCallouts(opts: {
  volunteers: VolunteerAnalyticsRow[];
  pending: number;
  contacted: number;
  taskCount: number;
  assignmentCount: number;
}): VolunteerAnalyticsCallout[] {
  const callouts: VolunteerAnalyticsCallout[] = [];
  const structuredPending = opts.volunteers.filter(
    (v) => v.status === "pending" && Boolean(v.fieldRole && v.fieldRole.trim()),
  ).length;
  const contactedWithoutRole = opts.volunteers.filter(
    (v) => v.status === "contacted" && !(v.fieldRole && v.fieldRole.trim()),
  ).length;

  if (
    opts.volunteers.length > 0 &&
    structuredPending > 0 &&
    opts.contacted > 0 &&
    contactedWithoutRole === opts.contacted
  ) {
    callouts.push({
      id: "pipeline-inverted",
      severity: "warning",
      message:
        "Los contactados salen del formulario básico (sin field_role) mientras los roles estructurados siguen en pending.",
    });
  }

  if (opts.volunteers.length > 0 && opts.taskCount === 0 && opts.assignmentCount === 0) {
    callouts.push({
      id: "no-dispatch",
      severity: "critical",
      message:
        "Hay oferta de voluntarios pero volunteer_tasks / volunteer_assignments están vacías: no hay despacho.",
    });
  }

  if (opts.pending > 0 && opts.contacted === 0 && opts.volunteers.length >= 5) {
    callouts.push({
      id: "all-pending",
      severity: "info",
      message: "Toda la cohorte visible sigue en pending; el pipeline de contacto no ha arrancado.",
    });
  }

  return callouts;
}

/**
 * Build the public aggregate payload from in-memory volunteer rows + KPI counts.
 */
export function computeVolunteerAnalytics(input: ComputeInput): VolunteerAnalyticsResponse {
  const { volunteers, taskCount, assignmentCount, now } = input;

  if (volunteers.length === 0) {
    return {
      generatedAt: now,
      empty: true,
      ...(input.sinceIso ? { cohort: { since: input.sinceIso } } : {}),
      kpis: {
        volunteers: 0,
        pending: 0,
        contacted: 0,
        tasks: taskCount,
        assignments: assignmentCount,
      },
      intents: [],
      pipeline: [],
      geo: [],
      availability: [],
      digitalSkills: [],
      hourly: [],
      sources: [],
      callouts: [],
      offerTypes: [],
      modality: { ...EMPTY_MODALITY },
      pipelineByIntent: [],
      formCohorts: {
        structured: { ...EMPTY_FORM_COHORTS.structured },
        intermediate: { ...EMPTY_FORM_COHORTS.intermediate },
        basic: { ...EMPTY_FORM_COHORTS.basic },
      },
      fieldCapacity: { ...EMPTY_FIELD_CAPACITY },
      actions: emptyActions(taskCount),
    };
  }

  const intentCounts = new Map<string, number>();
  const statusCounts = new Map<string, number>();
  const geoCounts = new Map<string, number>();
  const availabilityCounts = new Map<string, number>();
  const skillCounts = new Map<string, number>();
  const hourCounts = new Map<number, number>();
  const sourceCounts = new Map<string, number>();
  const offerTypeCounts = new Map<string, number>();
  const modality: ModalityCounts = { campo: 0, digital: 0, unclear: 0 };
  const formCohorts: FormCohorts = {
    structured: { total: 0, contacted: 0 },
    intermediate: { total: 0, contacted: 0 },
    basic: { total: 0, contacted: 0 },
  };
  const fieldCapacity: FieldCapacity = { vehicle: 0, rescue: 0, crisis: 0 };
  const pipelinePending = new Map<string, number>();
  const pipelineContacted = new Map<string, number>();

  let pending = 0;
  let contacted = 0;

  for (const v of volunteers) {
    if (v.status === "pending") pending += 1;
    else if (v.status === "contacted") contacted += 1;
    bump(statusCounts, v.status || "unknown");

    const classifyInput = {
      fieldRole: v.fieldRole,
      offerTypes: v.offerTypes,
      digitalSkills: v.digitalSkills,
      offer: v.offer,
    };
    const intent = classifyVolunteerIntent(classifyInput);
    bump(intentCounts, intent.key);

    if (v.status === "pending") bump(pipelinePending, intent.key);
    else if (v.status === "contacted") bump(pipelineContacted, intent.key);

    const modalityKey = classifyModality(classifyInput);
    modality[modalityKey] += 1;

    const cohortKey = classifyFormCohort(classifyInput);
    formCohorts[cohortKey].total += 1;
    if (v.status === "contacted") formCohorts[cohortKey].contacted += 1;

    const offerLabels = asStringList(v.offerTypes);
    if (offerLabels.length === 0) {
      bump(offerTypeCounts, "sin tipo");
    } else {
      for (const label of offerLabels) bump(offerTypeCounts, label);
    }

    if (v.ownVehicle === true) fieldCapacity.vehicle += 1;
    if (v.rescueTraining === true) fieldCapacity.rescue += 1;
    if (v.crisisExperience === true) fieldCapacity.crisis += 1;

    const city = (v.fieldCity && v.fieldCity.trim()) || "Sin ciudad";
    bump(geoCounts, city);

    const avail = (v.availability && v.availability.trim()) || "Sin dato";
    bump(availabilityCounts, avail);

    for (const skill of asStringList(v.digitalSkills)) {
      bump(skillCounts, skill);
    }

    const hour = bogotaWallHour(v.createdAt);
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);

    if (v.source && v.source.trim()) {
      bump(sourceCounts, v.source.trim());
    }
  }

  const labels = labelByIntentKey();
  const intents: IntentBucket[] = [...intentCounts.entries()]
    .map(([key, count]) => ({
      key: key as IntentBucket["key"],
      label: labels[key] ?? key,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

  const pipeline: StatusBucket[] = [...statusCounts.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count || a.status.localeCompare(b.status));

  const geo: GeoBucket[] = [...geoCounts.entries()]
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));

  const hourly: HourBucket[] = [...hourCounts.entries()]
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour - b.hour);

  const intentKeysSeen = new Set([...pipelinePending.keys(), ...pipelineContacted.keys()]);
  const pipelineByIntent: PipelineByIntentBucket[] = [...intentKeysSeen]
    .map((key) => ({
      key: key as IntentKey,
      label: labels[key] ?? key,
      pending: pipelinePending.get(key) ?? 0,
      contacted: pipelineContacted.get(key) ?? 0,
    }))
    .sort((a, b) => b.pending + b.contacted - (a.pending + a.contacted) || a.key.localeCompare(b.key));

  const actions = buildActions({
    pipelineByIntent,
    intents,
    modality,
    tasks: taskCount,
  });

  const response: VolunteerAnalyticsResponse = {
    generatedAt: now,
    empty: false,
    ...(input.sinceIso ? { cohort: { since: input.sinceIso } } : {}),
    kpis: {
      volunteers: volunteers.length,
      pending,
      contacted,
      tasks: taskCount,
      assignments: assignmentCount,
    },
    intents,
    pipeline,
    geo,
    availability: sortedCountBuckets(availabilityCounts),
    digitalSkills: sortedCountBuckets(skillCounts),
    hourly,
    sources: sortedCountBuckets(sourceCounts),
    callouts: buildCallouts({
      volunteers,
      pending,
      contacted,
      taskCount,
      assignmentCount,
    }),
    offerTypes: sortedCountBuckets(offerTypeCounts),
    modality,
    pipelineByIntent,
    formCohorts,
    fieldCapacity,
    actions,
  };

  return response;
}
