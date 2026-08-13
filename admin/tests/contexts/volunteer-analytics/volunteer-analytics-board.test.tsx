/**
 * Volunteer analytics board — MSW TDD (WU4).
 * Synthetic DEMO payload only (no real crisis PII).
 */
import { HttpResponse, http } from "msw";
import { screen, waitFor } from "@testing-library/react";
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
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Intenciones")).toBeInTheDocument();
    expect(screen.getByText("Pipeline")).toBeInTheDocument();
    expect(screen.getByText("Geografía")).toBeInTheDocument();
    expect(screen.getByText("Disponibilidad")).toBeInTheDocument();
    expect(screen.getByText("Skills digitales")).toBeInTheDocument();
    expect(screen.getByText("Altas por hora")).toBeInTheDocument();
    expect(screen.getByText("Fuentes")).toBeInTheDocument();
    expect(screen.getByText(/no hay despacho/i)).toBeInTheDocument();
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
    expect(await screen.findByText("3")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /actualizar/i }));
    await waitFor(() => expect(screen.getByText("9")).toBeInTheDocument());
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
