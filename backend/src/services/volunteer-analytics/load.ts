/**
 * Load volunteer classification rows + KPI counts, then aggregate (no PII out).
 */
import { count, gte } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { computeVolunteerAnalytics } from "./compute";
import type { VolunteerAnalyticsResponse } from "./types";

export type LoadAnalyticsOpts = {
  sinceMs?: number;
  sinceIso?: string;
  now?: number;
};

/**
 * SELECT only classification / status / geo / skills / source / created_at.
 * Never selects name, contact, notes, ip_hash.
 */
export async function loadVolunteerAnalytics(
  opts: LoadAnalyticsOpts = {},
): Promise<VolunteerAnalyticsResponse> {
  const db = getDb();
  const now = opts.now ?? Date.now();
  const sinceFilter =
    opts.sinceMs != null ? gte(schema.volunteers.createdAt, opts.sinceMs) : undefined;

  const volunteers = await db
    .select({
      status: schema.volunteers.status,
      fieldRole: schema.volunteers.fieldRole,
      offerTypes: schema.volunteers.offerTypes,
      digitalSkills: schema.volunteers.digitalSkills,
      offer: schema.volunteers.offer,
      fieldCity: schema.volunteers.fieldCity,
      availability: schema.volunteers.availability,
      source: schema.volunteers.source,
      createdAt: schema.volunteers.createdAt,
    })
    .from(schema.volunteers)
    .where(sinceFilter);

  // Tasks/assignments are KPI counts only (V1). Optional since does not filter them —
  // they are operational inventory, not cohort signup metrics.
  const [taskRow] = await db.select({ n: count() }).from(schema.volunteerTasks);
  const [assignRow] = await db.select({ n: count() }).from(schema.volunteerAssignments);

  return computeVolunteerAnalytics({
    volunteers,
    taskCount: Number(taskRow?.n ?? 0),
    assignmentCount: Number(assignRow?.n ?? 0),
    now,
    sinceMs: opts.sinceMs,
    sinceIso: opts.sinceIso,
  });
}

/** Cache key helpers — kept pure for tests. */
export function volunteerAnalyticsCacheKey(sinceIso?: string): string {
  return sinceIso ? `vol:analytics:inc:${sinceIso}` : "vol:analytics:full";
}
