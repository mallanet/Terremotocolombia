/**
 * Volunteer analytics response types (aggregates only — no PII).
 */
import type { IntentKey } from "./classify-intent";

export type CalloutSeverity = "info" | "warning" | "critical";

export type VolunteerAnalyticsCallout = {
  id: string;
  severity: CalloutSeverity;
  message: string;
};

export type VolunteerAnalyticsKpis = {
  volunteers: number;
  pending: number;
  contacted: number;
  tasks: number;
  assignments: number;
};

export type CountBucket = { key: string; count: number };
export type IntentBucket = { key: IntentKey; label: string; count: number };
export type StatusBucket = { status: string; count: number };
export type GeoBucket = { city: string; count: number };
export type HourBucket = { hour: number; count: number };

export type ModalityCounts = { campo: number; digital: number; unclear: number };

export type PipelineByIntentBucket = {
  key: IntentKey;
  label: string;
  pending: number;
  contacted: number;
};

export type FormCohortStats = { total: number; contacted: number };

export type FormCohorts = {
  structured: FormCohortStats;
  intermediate: FormCohortStats;
  basic: FormCohortStats;
};

export type FieldCapacity = { vehicle: number; rescue: number; crisis: number };

export type ActionScarceBreakdown = {
  key: IntentKey;
  label: string;
  pending: number;
};

export type ActionVolumeBreakdown = {
  key: IntentKey;
  label: string;
  count: number;
};

export type VolunteerAnalyticsActions = {
  p0: {
    id: "contact-scarce";
    priority: "P0";
    title: "Contactar escasos";
    count: number;
    breakdown: ActionScarceBreakdown[];
  };
  p1: {
    id: "dispatch-volume";
    priority: "P1";
    title: "Despachar volumen";
    count: number;
    tasks: number;
    breakdown: ActionVolumeBreakdown[];
  };
  p2: {
    id: "remote-bank";
    priority: "P2";
    title: "Banco remoto";
    count: number;
  };
};

export type VolunteerAnalyticsResponse = {
  generatedAt: number;
  empty: boolean;
  cohort?: { since: string };
  kpis: VolunteerAnalyticsKpis;
  intents: IntentBucket[];
  pipeline: StatusBucket[];
  geo: GeoBucket[];
  availability: CountBucket[];
  digitalSkills: CountBucket[];
  hourly: HourBucket[];
  sources: CountBucket[];
  callouts: VolunteerAnalyticsCallout[];
  offerTypes: CountBucket[];
  modality: ModalityCounts;
  pipelineByIntent: PipelineByIntentBucket[];
  formCohorts: FormCohorts;
  fieldCapacity: FieldCapacity;
  actions: VolunteerAnalyticsActions;
};
