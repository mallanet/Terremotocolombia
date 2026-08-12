/** Volunteer analytics aggregate DTO (mirrors backend — no PII). */

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
export type IntentBucket = { key: string; label: string; count: number };
export type StatusBucket = { status: string; count: number };
export type GeoBucket = { city: string; count: number };
export type HourBucket = { hour: number; count: number };

export type ModalityCounts = { campo: number; digital: number; unclear: number };

export type PipelineByIntentBucket = {
  key: string;
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
  key: string;
  label: string;
  pending: number;
};

export type ActionVolumeBreakdown = {
  key: string;
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

/** DESIGN.md token hex for Recharts series (docs/DESIGN.md). */
export const CHART_COLORS = {
  brandBlue: "#4080f2",
  volunteerGreen: "#047857",
  crisisRed: "#CE1126",
  warning: "#FBB658",
  success: "#10B981",
  brandNavy: "#0f2154",
  textMuted: "#52606D",
} as const;

export const SERIES_PALETTE = [
  CHART_COLORS.brandBlue,
  CHART_COLORS.volunteerGreen,
  CHART_COLORS.brandNavy,
  CHART_COLORS.warning,
  CHART_COLORS.success,
  CHART_COLORS.crisisRed,
  CHART_COLORS.textMuted,
] as const;
