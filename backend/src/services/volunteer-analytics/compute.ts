/**
 * Pure aggregate builder for volunteer analytics (no DB I/O).
 */
import { classifyVolunteerIntent, INTENT_TAXONOMY } from "./classify-intent";
import type {
  CountBucket,
  GeoBucket,
  HourBucket,
  IntentBucket,
  StatusBucket,
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
};

export type ComputeInput = {
  volunteers: VolunteerAnalyticsRow[];
  taskCount: number;
  assignmentCount: number;
  now: number;
  sinceMs?: number;
  sinceIso?: string;
};

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
    };
  }

  const intentCounts = new Map<string, number>();
  const statusCounts = new Map<string, number>();
  const geoCounts = new Map<string, number>();
  const availabilityCounts = new Map<string, number>();
  const skillCounts = new Map<string, number>();
  const hourCounts = new Map<number, number>();
  const sourceCounts = new Map<string, number>();

  let pending = 0;
  let contacted = 0;

  for (const v of volunteers) {
    if (v.status === "pending") pending += 1;
    else if (v.status === "contacted") contacted += 1;
    bump(statusCounts, v.status || "unknown");

    const intent = classifyVolunteerIntent({
      fieldRole: v.fieldRole,
      offerTypes: v.offerTypes,
      digitalSkills: v.digitalSkills,
      offer: v.offer,
    });
    bump(intentCounts, intent.key);

    const city = (v.fieldCity && v.fieldCity.trim()) || "Sin ciudad";
    bump(geoCounts, city);

    const avail = (v.availability && v.availability.trim()) || "Sin dato";
    bump(availabilityCounts, avail);

    for (const skill of asStringList(v.digitalSkills)) {
      bump(skillCounts, skill);
    }

    const hour = new Date(v.createdAt).getUTCHours();
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);

    if (v.source && v.source.trim()) {
      bump(sourceCounts, v.source.trim());
    }
  }

  const labelByKey = Object.fromEntries(INTENT_TAXONOMY.map((t) => [t.key, t.label]));
  const intents: IntentBucket[] = [...intentCounts.entries()]
    .map(([key, count]) => ({
      key: key as IntentBucket["key"],
      label: labelByKey[key] ?? key,
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
  };

  return response;
}
