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
