/**
 * Aggregate compute (WU3) — KPIs, buckets, callouts, no PII keys.
 */
import { describe, expect, it } from "vitest";
import {
  computeVolunteerAnalytics,
  type VolunteerAnalyticsRow,
} from "@/services/volunteer-analytics/compute";

/** Person-row / PII keys — callout `id` is allowed (ops message key, not a person). */
const FORBIDDEN_KEYS = [
  "name",
  "phone",
  "email",
  "document",
  "notes",
  "ip",
  "ipHash",
  "ip_hash",
  "contact",
  "offer",
] as const;

function row(partial: Partial<VolunteerAnalyticsRow> & { status: string }): VolunteerAnalyticsRow {
  return {
    status: partial.status,
    fieldRole: partial.fieldRole ?? null,
    offerTypes: partial.offerTypes ?? null,
    digitalSkills: partial.digitalSkills ?? null,
    offer: partial.offer ?? null,
    fieldCity: partial.fieldCity ?? null,
    availability: partial.availability ?? null,
    source: partial.source ?? null,
    createdAt: partial.createdAt ?? Date.UTC(2026, 7, 11, 18, 0, 0),
  };
}

function assertNoForbiddenKeys(value: unknown, path = "$"): void {
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertNoForbiddenKeys(v, `${path}[${i}]`));
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, child] of Object.entries(value as Record<string, unknown>)) {
      expect(FORBIDDEN_KEYS.includes(k as (typeof FORBIDDEN_KEYS)[number])).toBe(false);
      assertNoForbiddenKeys(child, `${path}.${k}`);
    }
  }
}

describe("computeVolunteerAnalytics", () => {
  it("returns empty=true and zero KPIs when no volunteers", () => {
    const result = computeVolunteerAnalytics({
      volunteers: [],
      taskCount: 0,
      assignmentCount: 0,
      now: 1_700_000_000_000,
    });
    expect(result.empty).toBe(true);
    expect(result.kpis).toEqual({
      volunteers: 0,
      pending: 0,
      contacted: 0,
      tasks: 0,
      assignments: 0,
    });
    expect(result.intents).toEqual([]);
    expect(result.generatedAt).toBe(1_700_000_000_000);
  });

  it("aggregates KPIs, intents, pipeline, geo, and task/assignment counts only", () => {
    const result = computeVolunteerAnalytics({
      volunteers: [
        row({
          status: "pending",
          fieldRole: "acopio",
          fieldCity: "Bogotá",
          availability: "fines de semana",
          digitalSkills: ["redes"],
          source: "form",
          createdAt: Date.UTC(2026, 7, 11, 14, 0, 0),
        }),
        row({
          status: "contacted",
          offer: "ayuda digital remota",
          fieldCity: "Medellín",
          availability: "alta",
          source: "form",
          createdAt: Date.UTC(2026, 7, 11, 19, 0, 0),
        }),
        row({
          status: "pending",
          fieldRole: "salud",
          fieldCity: "Bogotá",
          createdAt: Date.UTC(2026, 7, 11, 19, 30, 0),
        }),
      ],
      taskCount: 2,
      assignmentCount: 1,
      now: 1_700_000_000_100,
    });

    expect(result.empty).toBe(false);
    expect(result.kpis).toEqual({
      volunteers: 3,
      pending: 2,
      contacted: 1,
      tasks: 2,
      assignments: 1,
    });
    expect(result.intents.find((i) => i.key === "acopio")?.count).toBe(1);
    expect(result.intents.find((i) => i.key === "clinical_health")?.count).toBe(1);
    expect(result.intents.find((i) => i.key === "digital_remote")?.count).toBe(1);
    expect(result.pipeline).toEqual(
      expect.arrayContaining([
        { status: "pending", count: 2 },
        { status: "contacted", count: 1 },
      ]),
    );
    expect(result.geo.find((g) => g.city === "Bogotá")?.count).toBe(2);
    expect(result.geo.find((g) => g.city === "Medellín")?.count).toBe(1);
    expect(result.hourly.find((h) => h.hour === 14)?.count).toBe(1);
    expect(result.hourly.find((h) => h.hour === 19)?.count).toBe(2);
    expect(result.sources.find((s) => s.key === "form")?.count).toBe(2);
  });

  it("emits V1 callouts when structured roles are pending and tasks empty", () => {
    const result = computeVolunteerAnalytics({
      volunteers: [
        row({ status: "pending", fieldRole: "acopio" }),
        row({ status: "pending", fieldRole: "logistica" }),
        row({ status: "contacted", offer: "manos generales" }),
      ],
      taskCount: 0,
      assignmentCount: 0,
      now: Date.now(),
    });
    const ids = result.callouts.map((c) => c.id);
    expect(ids).toContain("pipeline-inverted");
    expect(ids).toContain("no-dispatch");
    expect(result.callouts.every((c) => typeof c.message === "string" && c.message.length > 0)).toBe(
      true,
    );
  });

  it("never includes forbidden PII keys in the aggregate JSON", () => {
    const result = computeVolunteerAnalytics({
      volunteers: [
        row({
          status: "pending",
          fieldRole: "cocina",
          // Classification text only — compute must not echo raw offer into response.
          offer: "DEMO-offer-text-should-not-leak",
        }),
      ],
      taskCount: 0,
      assignmentCount: 0,
      now: Date.now(),
    });
    assertNoForbiddenKeys(result);
    expect(JSON.stringify(result)).not.toContain("DEMO-offer-text-should-not-leak");
  });

  it("attaches cohort.since when sinceMs is provided", () => {
    const since = "2026-08-11T12:00:00.000Z";
    const result = computeVolunteerAnalytics({
      volunteers: [row({ status: "pending", fieldRole: "acopio" })],
      taskCount: 0,
      assignmentCount: 0,
      now: Date.now(),
      sinceMs: Date.parse(since),
      sinceIso: since,
    });
    expect(result.cohort).toEqual({ since });
  });
});
