import { HttpResponse, http } from "msw";
import { screen, fireEvent, render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { server } from "@/tests/setup";
import { AdminSessionContext } from "@/src/shared/auth/admin-session-context";
import { ClusterFicha } from "@/src/contexts/family-search/cluster-ficha";
import { SignalQueue } from "@/src/contexts/family-search/signal-queue";
import { withSession } from "./test-utils";

const baseFicha = {
  clusterId: "cluster-1",
  status: "reported_missing",
  createdAt: 1000,
  members: [
    {
      prn: "TC-DEMO0001X",
      recordType: "missing_report",
      name: "Demo Uno",
      age: 30,
      population: "missing_report",
      source: "Cruz Roja Demo",
      outcome: null,
      clusterId: "cluster-1",
      addedAt: 1000,
      removedAt: null,
      addedBy: "u1",
    },
    {
      prn: "TC-DEMO0002Y",
      recordType: "hospital_patient",
      name: "Demo Dos",
      age: 31,
      population: "hospital_patient",
      source: "Hospital Demo",
      outcome: null,
      clusterId: "cluster-1",
      addedAt: 1000,
      removedAt: null,
      addedBy: "u1",
    },
  ],
  decisions: [
    {
      id: "dec-1",
      linkId: "link-1",
      prnA: "TC-DEMO0001X",
      prnB: "TC-DEMO0002Y",
      decision: "confirmed",
      note: "",
      evidenceSnapshot: { evidenceClass: "name_age_exact" },
      decidedBy: "u1",
      decidedAt: 900,
    },
  ],
};

describe("ClusterFicha", () => {
  it("renderiza miembros lado a lado y la historia de decisiones", async () => {
    server.use(
      http.get("/api/admin/family-search/clusters/cluster-1", () =>
        HttpResponse.json({ item: baseFicha }),
      ),
    );
    withSession(<ClusterFicha target={{ type: "cluster", clusterId: "cluster-1" }} onJumpToQueue={() => {}} />);

    expect(await screen.findByText("Demo Uno")).toBeInTheDocument();
    expect(screen.getByText("Demo Dos")).toBeInTheDocument();
    expect(screen.getByText("TC-DEMO0001X")).toBeInTheDocument();
    expect(screen.getByText("TC-DEMO0002Y")).toBeInTheDocument();
    expect(screen.getByText("Confirmado")).toBeInTheDocument();
  });

  it("adjuntar un registro por búsqueda manual muestra la confirmación con el enlace a la cola", async () => {
    server.use(
      http.get("/api/admin/family-search/clusters/cluster-1", () =>
        HttpResponse.json({ item: baseFicha }),
      ),
      http.get("/api/admin/family-search/records/search", () =>
        HttpResponse.json({
          exactPrnMatch: null,
          results: [
            {
              prn: "TC-DEMO0003Z",
              recordType: "unidentified_person",
              name: "Demo Tres",
              age: null,
              population: "unidentified_person",
              source: "",
              outcome: null,
              clusterId: null,
            },
          ],
        }),
      ),
      http.post("/api/admin/family-search/propose", () =>
        HttpResponse.json({
          item: {
            id: "link-new",
            prnA: "TC-DEMO0001X",
            prnB: "TC-DEMO0003Z",
            status: "proposed",
            score: null,
            evidence: {},
            evidenceClass: "manual",
            method: "manual",
            matcherVersion: null,
            proposedAt: 2000,
          },
          created: true,
        }),
      ),
    );
    withSession(<ClusterFicha target={{ type: "cluster", clusterId: "cluster-1" }} onJumpToQueue={() => {}} />);
    await screen.findByText("Demo Uno");

    fireEvent.change(screen.getByLabelText("Buscar por nombre o PRN"), {
      target: { value: "Demo Tres" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    fireEvent.click(await screen.findByRole("button", { name: "Adjuntar" }));

    expect(
      await screen.findByText(/Propuesta creada — pendiente en la cola de revisión\./),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ir a la cola" })).toBeInTheDocument();
  });

  it("una ficha standalone (sin cluster todavía) permite proponer el primer vínculo", async () => {
    withSession(
      <ClusterFicha
        target={{
          type: "standalone",
          record: {
            prn: "TC-DEMO0004W",
            recordType: "missing_report",
            name: "Demo Aislado",
            age: 40,
            population: "missing_report",
            source: "",
            outcome: null,
            clusterId: null,
          },
        }}
        onJumpToQueue={() => {}}
      />,
    );

    expect(await screen.findByText("Registro sin cluster")).toBeInTheDocument();
    expect(screen.getByText("Demo Aislado")).toBeInTheDocument();
    expect(screen.getByText("Vincular otro registro manualmente")).toBeInTheDocument();
  });

  it("sin cache de señales (la pestaña 'Señales' nunca se visitó), el chip NO aparece — limitación documentada (U15 §4)", async () => {
    server.use(
      http.get("/api/admin/family-search/clusters/cluster-1", () =>
        HttpResponse.json({ item: baseFicha }),
      ),
    );
    withSession(<ClusterFicha target={{ type: "cluster", clusterId: "cluster-1" }} onJumpToQueue={() => {}} />);

    await screen.findByText("Demo Uno");
    expect(screen.queryByTestId("cluster-ficha-signals-chip")).not.toBeInTheDocument();
  });

  it("con señales YA cacheadas para este cluster (visitó 'Señales' antes), el chip 'Señales pendientes (N)' aparece y abre esa pestaña", async () => {
    server.use(
      http.get("/api/admin/family-search/clusters/cluster-1", () =>
        HttpResponse.json({ item: baseFicha }),
      ),
      http.get("/api/admin/family-search/signals", () =>
        HttpResponse.json({
          items: [
            {
              id: "signal-1",
              prn: "TC-DEMO0001X",
              source: "partner:demo",
              kind: "status_report",
              claimedStatus: "found",
              storedStatus: "active",
              payload: {},
              createdAt: 1,
              record: { ...baseFicha.members[0], clusterId: "cluster-1" },
            },
          ],
        }),
      ),
    );
    // MISMO queryClient para las dos fases, a propósito: reproduce el flujo
    // real (family-search-admin.tsx) — SignalQueue cachea la cola de señales
    // mientras la pestaña "Señales" está activa; al navegar a la ficha del
    // cluster (montaje NUEVO de ClusterFicha, ver comentario en U15 §4 del
    // componente) esa cache YA está tibia. `withSession` no expone su
    // queryClient interno, así que aquí se arma a mano en vez de usarlo.
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: Infinity } },
    });
    const capabilities = ["person:search", "person:review", "person:merge"];
    const session = {
      user: { id: "u1", email: "demo@example.test", roleId: null, orgId: null, isAdmin: false },
      capabilities,
      isLoading: false,
      sessionCheckFailed: false,
      retrySessionCheck: () => {},
      login: async () => {},
      logout: async () => {},
      can: (capability: string) => capabilities.includes(capability),
    };

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <AdminSessionContext.Provider value={session}>
          <SignalQueue onOpenFicha={() => {}} />
        </AdminSessionContext.Provider>
      </QueryClientProvider>,
    );
    await screen.findByTestId("signal-card");

    let onOpenSignalsCalls = 0;
    rerender(
      <QueryClientProvider client={queryClient}>
        <AdminSessionContext.Provider value={session}>
          <ClusterFicha
            target={{ type: "cluster", clusterId: "cluster-1" }}
            onJumpToQueue={() => {}}
            onOpenSignals={() => (onOpenSignalsCalls += 1)}
          />
        </AdminSessionContext.Provider>
      </QueryClientProvider>,
    );

    const chip = await screen.findByTestId("cluster-ficha-signals-chip");
    expect(chip).toHaveTextContent("Señales pendientes (1)");
    fireEvent.click(chip);
    expect(onOpenSignalsCalls).toBe(1);
  });
});
