/**
 * Volunteer analytics board — MSW TDD (parity WU3–WU4).
 * Synthetic DEMO payload only (no real crisis PII).
 */
import { HttpResponse, http } from "msw";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { server } from "@/tests/setup";
import { renderWithProviders } from "@/tests/_utils/render-with-providers";
import { VolunteerAnalyticsBoard } from "@/src/contexts/volunteer-analytics/volunteer-analytics-board";
import { AdminSessionContext } from "@/src/shared/auth/admin-session-context";
import type { VolunteerAnalyticsResponse } from "@/src/contexts/volunteer-analytics/types";

beforeAll(() => {
  // Recharts ResponsiveContainer needs ResizeObserver (absent in jsdom).
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
});

const emptyActions = {
  p0: {
    id: "contact-scarce" as const,
    priority: "P0" as const,
    title: "Contactar escasos" as const,
    count: 0,
    breakdown: [],
  },
  p1: {
    id: "dispatch-volume" as const,
    priority: "P1" as const,
    title: "Despachar volumen" as const,
    count: 0,
    tasks: 0,
    breakdown: [],
  },
  p2: {
    id: "remote-bank" as const,
    priority: "P2" as const,
    title: "Banco remoto" as const,
    count: 0,
  },
};

const payload: VolunteerAnalyticsResponse = {
  generatedAt: 1_700_000_000_000,
  empty: false,
  kpis: { volunteers: 3, pending: 2, contacted: 1, tasks: 0, assignments: 0 },
  intents: [{ key: "acopio", label: "Acopio / centros", count: 2 }],
  pipeline: [
    { status: "pending", count: 2 },
    { status: "contacted", count: 1 },
  ],
  geo: [{ city: "Ciudad Central", count: 3 }],
  availability: [{ key: "parcial", count: 2 }],
  digitalSkills: [{ key: "redes", count: 1 }],
  hourly: [{ hour: 18, count: 3 }],
  sources: [{ key: "demo-seed", count: 3 }],
  callouts: [
    {
      id: "no-dispatch",
      severity: "critical",
      message: "Hay oferta de voluntarios pero no hay despacho.",
    },
  ],
  offerTypes: [
    { key: "transporte", count: 4 },
    { key: "digital", count: 2 },
  ],
  modality: { campo: 5, digital: 7, unclear: 3 },
  pipelineByIntent: [
    { key: "clinical_health", label: "Salud clínica", pending: 3, contacted: 1 },
    { key: "acopio", label: "Acopio / centros", pending: 2, contacted: 0 },
  ],
  formCohorts: {
    structured: { total: 4, contacted: 1 },
    intermediate: { total: 6, contacted: 2 },
    basic: { total: 5, contacted: 0 },
  },
  fieldCapacity: { vehicle: 8, rescue: 2, crisis: 3 },
  actions: {
    p0: {
      id: "contact-scarce",
      priority: "P0",
      title: "Contactar escasos",
      count: 11,
      breakdown: [
        { key: "clinical_health", label: "Salud clínica", pending: 3 },
        { key: "structural_eval", label: "Evaluación estructural", pending: 2 },
        { key: "transport_driver", label: "Transporte / chofer", pending: 4 },
        { key: "psychosocial", label: "Apoyo psicosocial", pending: 2 },
      ],
    },
    p1: {
      id: "dispatch-volume",
      priority: "P1",
      title: "Despachar volumen",
      count: 9,
      tasks: 0,
      breakdown: [
        { key: "acopio", label: "Acopio / centros", count: 6 },
        { key: "field_logistics", label: "Logística de campo", count: 3 },
      ],
    },
    p2: {
      id: "remote-bank",
      priority: "P2",
      title: "Banco remoto",
      count: 7,
    },
  },
};

const emptyPayload: VolunteerAnalyticsResponse = {
  generatedAt: 1_700_000_000_100,
  empty: true,
  kpis: { volunteers: 0, pending: 0, contacted: 0, tasks: 0, assignments: 0 },
  intents: [],
  pipeline: [],
  geo: [],
  availability: [],
  digitalSkills: [],
  hourly: [],
  sources: [],
  callouts: [],
  offerTypes: [],
  modality: { campo: 0, digital: 0, unclear: 0 },
  pipelineByIntent: [],
  formCohorts: {
    structured: { total: 0, contacted: 0 },
    intermediate: { total: 0, contacted: 0 },
    basic: { total: 0, contacted: 0 },
  },
  fieldCapacity: { vehicle: 0, rescue: 0, crisis: 0 },
  actions: emptyActions,
};

function renderBoard(capabilities: string[]) {
  return renderWithProviders(
    <AdminSessionContext.Provider
      value={{
        user: { id: "u", email: "admin@example.org", roleId: null, orgId: null, isAdmin: true },
        capabilities,
        isLoading: false,
        sessionCheckFailed: false,
        retrySessionCheck: () => {},
        login: vi.fn(),
        logout: vi.fn(),
        can: (cap) => capabilities.includes("*") || capabilities.includes(cap),
      }}
    >
      <VolunteerAnalyticsBoard />
    </AdminSessionContext.Provider>,
  );
}

describe("VolunteerAnalyticsBoard", () => {
  it("first paint requests full corpus and renders KPIs, sections, callouts", async () => {
    server.use(http.get("/api/admin/volunteer-analytics", () => HttpResponse.json(payload)));
    renderBoard(["volunteer:read"]);

    expect(await screen.findByText("Voluntarios")).toBeInTheDocument();
    expect(screen.getByText("Voluntarios").closest("div")?.textContent).toMatch(/3/);
    expect(screen.getByText("Intenciones")).toBeInTheDocument();
    expect(screen.getByText("Pipeline")).toBeInTheDocument();
    expect(screen.getByText("Geografía")).toBeInTheDocument();
    expect(screen.getByText("Disponibilidad")).toBeInTheDocument();
    expect(screen.getByText("Skills digitales")).toBeInTheDocument();
    expect(screen.getByText("Altas por hora")).toBeInTheDocument();
    expect(screen.getByText("Fuentes")).toBeInTheDocument();
    expect(screen.getByText(/no hay despacho/i)).toBeInTheDocument();
  });

  it("renders seven P0 parity sections with live counts", async () => {
    server.use(http.get("/api/admin/volunteer-analytics", () => HttpResponse.json(payload)));
    renderBoard(["volunteer:read"]);

    expect(await screen.findByText("Tipos de oferta")).toBeInTheDocument();
    expect(screen.getByText("Modalidad")).toBeInTheDocument();
    expect(screen.getByText("Pipeline por intención")).toBeInTheDocument();
    expect(screen.getByText("Cohortes de formulario")).toBeInTheDocument();
    expect(screen.getByText("Capacidad de campo")).toBeInTheDocument();
    expect(screen.getByText("Contactar escasos")).toBeInTheDocument();
    expect(screen.getByText("Despachar volumen")).toBeInTheDocument();

    expect(screen.getByText("Banco remoto")).toBeInTheDocument();
    expect(screen.getByText("Contactar escasos").closest("article")?.textContent).toMatch(/11/);
    expect(screen.getByText("Despachar volumen").closest("article")?.textContent).toMatch(/9/);
    expect(screen.getByText("Banco remoto").closest("article")?.textContent).toMatch(/7/);
    expect(screen.getByText(/vehículo/i)).toBeInTheDocument();
    expect(screen.getByText(/vehículo/i).closest("div")?.textContent).toMatch(/8/);
    expect(screen.getByText(/estructurado/i)).toBeInTheDocument();
    expect(screen.getByText(/estructurado/i).closest("tr")?.textContent).toMatch(/4/);
  });

  it("action card counts differ across payloads (not canvas 28/52/32)", async () => {
    const alt: VolunteerAnalyticsResponse = {
      ...payload,
      kpis: { ...payload.kpis, volunteers: 2 },
      actions: {
        p0: { ...payload.actions.p0, count: 2 },
        p1: { ...payload.actions.p1, count: 1, tasks: 3 },
        p2: { ...payload.actions.p2, count: 4 },
      },
    };
    server.use(http.get("/api/admin/volunteer-analytics", () => HttpResponse.json(alt)));
    renderBoard(["volunteer:read"]);

    expect(await screen.findByText("Contactar escasos")).toBeInTheDocument();
    const p0 = screen.getByText("Contactar escasos").closest("article")!;
    const p1 = screen.getByText("Despachar volumen").closest("article")!;
    const p2 = screen.getByText("Banco remoto").closest("article")!;
    expect(within(p0).getByText("2")).toBeInTheDocument();
    expect(within(p1).getByText("1")).toBeInTheDocument();
    expect(within(p2).getByText("4")).toBeInTheDocument();
    expect(screen.queryByText("28")).not.toBeInTheDocument();
    expect(screen.queryByText("52")).not.toBeInTheDocument();
    expect(screen.queryByText("32")).not.toBeInTheDocument();
  });

  it("first paint omits since; last-24h toggle requests since ISO", async () => {
    const seen: string[] = [];
    server.use(
      http.get("/api/admin/volunteer-analytics", ({ request }) => {
        const url = new URL(request.url);
        seen.push(url.searchParams.get("since") ?? "");
        if (url.searchParams.has("since")) {
          return HttpResponse.json({
            ...payload,
            cohort: { since: url.searchParams.get("since")! },
            kpis: { ...payload.kpis, volunteers: 1 },
          });
        }
        return HttpResponse.json(payload);
      }),
    );
    renderBoard(["volunteer:read"]);
    expect(await screen.findByText("Voluntarios")).toBeInTheDocument();
    expect(seen[0]).toBe("");

    await userEvent.click(screen.getByRole("button", { name: /últimas 24h|last 24h|24\s*h/i }));
    await waitFor(() => expect(seen.some((s) => s.length > 0)).toBe(true));
    const sinceVal = seen.find((s) => s.length > 0)!;
    expect(() => new Date(sinceVal).toISOString()).not.toThrow();
    expect(Number.isNaN(Date.parse(sinceVal))).toBe(false);
  });

  it("Actualizar forces refresh=1 and updates from new payload", async () => {
    let calls = 0;
    server.use(
      http.get("/api/admin/volunteer-analytics", ({ request }) => {
        calls += 1;
        const url = new URL(request.url);
        if (url.searchParams.get("refresh") === "1") {
          return HttpResponse.json({
            ...payload,
            kpis: { ...payload.kpis, volunteers: 9 },
          });
        }
        return HttpResponse.json(payload);
      }),
    );
    renderBoard(["volunteer:read"]);
    expect(await screen.findByText("Voluntarios")).toBeInTheDocument();
    expect(screen.getByText("Voluntarios").closest("div")?.textContent).toMatch(/3/);

    await userEvent.click(screen.getByRole("button", { name: /actualizar/i }));
    await waitFor(() =>
      expect(screen.getByText("Voluntarios").closest("div")?.textContent).toMatch(/9/),
    );
    expect(calls).toBeGreaterThanOrEqual(2);
  });

  it("shows explicit empty/blocked state when empty=true (not quiet success charts)", async () => {
    server.use(http.get("/api/admin/volunteer-analytics", () => HttpResponse.json(emptyPayload)));
    renderBoard(["volunteer:read"]);

    expect(await screen.findByText(/sin voluntarios|analítica vacía|bloquead/i)).toBeInTheDocument();
    expect(screen.queryByText("Intenciones")).not.toBeInTheDocument();
  });

  it("on 403 does not render chart sections as authorized", async () => {
    server.use(
      http.get("/api/admin/volunteer-analytics", () =>
        HttpResponse.json({ error: "No tienes permiso" }, { status: 403 }),
      ),
    );
    renderBoard(["volunteer:read"]);

    expect(await screen.findByText(/403|permiso|no autorizad/i)).toBeInTheDocument();
    expect(screen.queryByText("Intenciones")).not.toBeInTheDocument();
  });
});
