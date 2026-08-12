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
    ownVehicle: partial.ownVehicle ?? null,
    rescueTraining: partial.rescueTraining ?? null,
    crisisExperience: partial.crisisExperience ?? null,
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
    // UTC 14:00 → America/Bogotá 09:00; UTC 19:00/19:30 → 14:00 Bogotá
    expect(result.hourly.find((h) => h.hour === 9)?.count).toBe(1);
    expect(result.hourly.find((h) => h.hour === 14)?.count).toBe(2);
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

  it("emits offerTypes, modality, pipelineByIntent, formCohorts, fieldCapacity (parity buckets)", () => {
    const result = computeVolunteerAnalytics({
      volunteers: [
        row({
          status: "pending",
          fieldRole: "salud",
          offerTypes: ["salud_clinica"],
          ownVehicle: true,
          rescueTraining: true,
        }),
        row({
          status: "contacted",
          digitalSkills: ["redes"],
          crisisExperience: true,
        }),
        row({
          status: "pending",
          offerTypes: ["transporte", "donacion"],
        }),
        row({
          status: "pending",
          offer: "zona únicamente",
        }),
      ],
      taskCount: 0,
      assignmentCount: 0,
      now: Date.now(),
    });

    expect(result.offerTypes.find((o) => o.key === "salud_clinica")?.count).toBe(1);
    expect(result.offerTypes.find((o) => o.key === "transporte")?.count).toBe(1);
    expect(result.offerTypes.find((o) => o.key === "donacion")?.count).toBe(1);
    expect(result.offerTypes.find((o) => o.key === "sin tipo")?.count).toBe(2);

    expect(result.modality).toEqual({ campo: 1, digital: 1, unclear: 2 });

    const health = result.pipelineByIntent.find((p) => p.key === "clinical_health");
    expect(health).toEqual(
      expect.objectContaining({ key: "clinical_health", pending: 1, contacted: 0 }),
    );
    const digital = result.pipelineByIntent.find((p) => p.key === "digital_remote");
    expect(digital).toEqual(
      expect.objectContaining({ key: "digital_remote", pending: 0, contacted: 1 }),
    );

    expect(result.formCohorts).toEqual({
      structured: { total: 1, contacted: 0 },
      intermediate: { total: 2, contacted: 1 },
      basic: { total: 1, contacted: 0 },
    });

    expect(result.fieldCapacity).toEqual({ vehicle: 1, rescue: 1, crisis: 1 });
  });

  it("zeros parity fields when empty", () => {
    const result = computeVolunteerAnalytics({
      volunteers: [],
      taskCount: 0,
      assignmentCount: 0,
      now: 1,
    });
    expect(result.offerTypes).toEqual([]);
    expect(result.modality).toEqual({ campo: 0, digital: 0, unclear: 0 });
    expect(result.pipelineByIntent).toEqual([]);
    expect(result.formCohorts).toEqual({
      structured: { total: 0, contacted: 0 },
      intermediate: { total: 0, contacted: 0 },
      basic: { total: 0, contacted: 0 },
    });
    expect(result.fieldCapacity).toEqual({ vehicle: 0, rescue: 0, crisis: 0 });
    expect(result.actions).toEqual({
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
        tasks: 0,
        breakdown: [],
      },
      p2: {
        id: "remote-bank",
        priority: "P2",
        title: "Banco remoto",
        count: 0,
      },
    });
  });

  it("builds actions from live scarce/volume/modality formulas (not canvas 28/52/32)", () => {
    const result = computeVolunteerAnalytics({
      volunteers: [
        row({ status: "pending", fieldRole: "salud" }),
        row({ status: "pending", fieldRole: "evaluacion_estructural" }),
        row({ status: "pending", fieldRole: "transporte" }),
        row({ status: "pending", fieldRole: "psicosocial" }),
        row({ status: "contacted", fieldRole: "salud" }),
        row({ status: "pending", fieldRole: "acopio" }),
        row({ status: "pending", fieldRole: "acopio" }),
        row({ status: "pending", fieldRole: "logistica" }),
        row({ status: "pending", digitalSkills: ["redes"] }),
        row({ status: "contacted", offer: "trabajo remoto online" }),
      ],
      taskCount: 0,
      assignmentCount: 0,
      now: Date.now(),
    });

    // SCARCE pending: salud+estructural+transporte+psicosocial = 4 (contacted salud excluded)
    expect(result.actions.p0.title).toBe("Contactar escasos");
    expect(result.actions.p0.priority).toBe("P0");
    expect(result.actions.p0.id).toBe("contact-scarce");
    expect(result.actions.p0.count).toBe(4);
    expect(result.actions.p0.breakdown.map((b) => b.key)).toEqual([
      "clinical_health",
      "structural_eval",
      "transport_driver",
      "psychosocial",
    ]);
    expect(result.actions.p0.breakdown.map((b) => b.pending)).toEqual([1, 1, 1, 1]);
    expect(result.actions.p0.count).not.toBe(28);

    // VOLUME intent totals: acopio(2)+field_logistics(1)=3; tasks from KPI
    expect(result.actions.p1.title).toBe("Despachar volumen");
    expect(result.actions.p1.count).toBe(3);
    expect(result.actions.p1.tasks).toBe(0);
    expect(result.actions.p1.count).not.toBe(52);

    // P2 = modality.digital (skills + free-text remote) = 2
    expect(result.actions.p2.title).toBe("Banco remoto");
    expect(result.actions.p2.count).toBe(result.modality.digital);
    expect(result.actions.p2.count).toBe(2);
    expect(result.actions.p2.count).not.toBe(32);
  });

  it("changes action counts when scarce pending / digital modality change", () => {
    const scarceHeavy = computeVolunteerAnalytics({
      volunteers: [
        row({ status: "pending", fieldRole: "salud" }),
        row({ status: "pending", fieldRole: "transporte" }),
        row({ status: "pending", digitalSkills: ["redes"] }),
      ],
      taskCount: 0,
      assignmentCount: 0,
      now: 1,
    });
    const scarceLight = computeVolunteerAnalytics({
      volunteers: [
        row({ status: "pending", fieldRole: "acopio" }),
        row({ status: "pending", fieldRole: "acopio" }),
      ],
      taskCount: 5,
      assignmentCount: 0,
      now: 1,
    });
    expect(scarceHeavy.actions.p0.count).toBe(2);
    expect(scarceLight.actions.p0.count).toBe(0);
    expect(scarceHeavy.actions.p0.count).not.toBe(scarceLight.actions.p0.count);
    expect(scarceHeavy.actions.p2.count).toBe(1);
    expect(scarceLight.actions.p2.count).toBe(0);
    expect(scarceLight.actions.p1.count).toBe(2);
    expect(scarceLight.actions.p1.tasks).toBe(5);
  });

  it("buckets hourly by America/Bogotá wall clock across a day boundary", () => {
    // 2026-08-12 04:30 UTC = 2026-08-11 23:30 Bogotá (UTC-5)
    // 2026-08-12 05:30 UTC = 2026-08-12 00:30 Bogotá
    const before = Date.UTC(2026, 7, 12, 4, 30, 0);
    const after = Date.UTC(2026, 7, 12, 5, 30, 0);
    const result = computeVolunteerAnalytics({
      volunteers: [
        row({ status: "pending", fieldRole: "acopio", createdAt: before }),
        row({ status: "pending", fieldRole: "acopio", createdAt: after }),
        row({ status: "pending", fieldRole: "acopio", createdAt: after }),
      ],
      taskCount: 0,
      assignmentCount: 0,
      now: after,
    });
    expect(result.hourly.find((h) => h.hour === 23)?.count).toBe(1);
    expect(result.hourly.find((h) => h.hour === 0)?.count).toBe(2);
    // Must NOT use UTC hours 4/5 for these timestamps
    expect(result.hourly.find((h) => h.hour === 4)?.count ?? 0).toBe(0);
    expect(result.hourly.find((h) => h.hour === 5)?.count ?? 0).toBe(0);
  });
});
