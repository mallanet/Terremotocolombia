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
