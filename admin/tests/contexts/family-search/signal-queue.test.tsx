import { HttpResponse, http } from "msw";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { server } from "@/tests/setup";
import { SignalQueue } from "@/src/contexts/family-search/signal-queue";
import { buildSignal, withSession } from "./test-utils";

describe("SignalQueue", () => {
  it("renderiza la señal pendiente ACTIVA (la más antigua) con estado reclamado/local y chip de procedencia", async () => {
    const older = buildSignal({
      id: "signal-old",
      createdAt: 500,
      claimedStatus: "found",
      storedStatus: "active",
      source: "partner:socio-a",
    });
    const newer = buildSignal({
      id: "signal-new",
      createdAt: 2000,
      record: { ...older.record!, prn: "TC-DEMO0003Z", name: "Demo Tres" },
    });
    server.use(
      // El backend ya devuelve la cola más-antigua-primero; el componente
      // toma items[0] como activa SIN reordenar — este test verifica que
      // efectivamente renderiza la primera del array como activa.
      http.get("/api/admin/family-search/signals", () =>
        HttpResponse.json({ items: [older, newer] }),
      ),
    );
    withSession(<SignalQueue onOpenFicha={() => {}} />);

    expect(await screen.findByTestId("signal-card")).toBeInTheDocument();
    expect(screen.getByTestId("signal-claimed-status")).toHaveTextContent(
      "El socio reporta: encontrada",
    );
    expect(screen.getByTestId("signal-stored-status")).toHaveTextContent("Estado local: activa");
    expect(screen.getByText("Fuente: partner:socio-a")).toBeInTheDocument();
    // La más nueva queda en la vista previa, no como activa.
    expect(await screen.findByText(/Demo Tres/)).toBeInTheDocument();
    expect(screen.getAllByTestId("signal-preview-item")).toHaveLength(1);
  });

  it("cola vacía muestra 'No hay señales pendientes.'", async () => {
    server.use(http.get("/api/admin/family-search/signals", () => HttpResponse.json({ items: [] })));
    withSession(<SignalQueue onOpenFicha={() => {}} />);

    expect(await screen.findByText("No hay señales pendientes.")).toBeInTheDocument();
  });

  it("teclado: 1 + Enter dispara la mutación de confirmar", async () => {
    const signal = buildSignal();
    let decisionBody: Record<string, unknown> | null = null;
    server.use(
      http.get("/api/admin/family-search/signals", () => HttpResponse.json({ items: [signal] })),
      http.post("/api/admin/family-search/signals/signal-1/decision", async ({ request }) => {
        decisionBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          item: { ...signal, status: "confirmed", decidedBy: "u1", decidedAt: 2, decisionNote: "" },
          idempotentReplay: false,
        });
      }),
    );
    withSession(<SignalQueue onOpenFicha={() => {}} />);
    await screen.findByTestId("signal-card");

    fireEvent.keyDown(document.body, { key: "1" });
    fireEvent.keyDown(document.body, { key: "Enter" });

    await waitFor(() => expect(decisionBody).not.toBeNull());
    expect(decisionBody).toEqual({ decision: "confirmar", note: undefined });
  });

  it("teclado: 2 sin nota bloquea el commit (ninguna request sale)", async () => {
    const signal = buildSignal();
    let calls = 0;
    server.use(
      http.get("/api/admin/family-search/signals", () => HttpResponse.json({ items: [signal] })),
      http.post("/api/admin/family-search/signals/signal-1/decision", () => {
        calls += 1;
        return HttpResponse.json({
          item: { ...signal, status: "dismissed" },
          idempotentReplay: false,
        });
      }),
    );
    withSession(<SignalQueue onOpenFicha={() => {}} />);
    await screen.findByTestId("signal-card");

    fireEvent.keyDown(document.body, { key: "2" });
    // El foco saltó a la nota (autofocus del "2").
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Enter" });

    expect(
      await screen.findByText("La nota es obligatoria para descartar una señal."),
    ).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(calls).toBe(0);
  });

  it("teclado: 2 + nota + Enter SÍ dispara el commit de descartar con la nota", async () => {
    const signal = buildSignal();
    let decisionBody: Record<string, unknown> | null = null;
    server.use(
      http.get("/api/admin/family-search/signals", () => HttpResponse.json({ items: [signal] })),
      http.post("/api/admin/family-search/signals/signal-1/decision", async ({ request }) => {
        decisionBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          item: { ...signal, status: "dismissed" },
          idempotentReplay: false,
        });
      }),
    );
    withSession(<SignalQueue onOpenFicha={() => {}} />);
    await screen.findByTestId("signal-card");

    fireEvent.keyDown(document.body, { key: "2" });
    const note = await screen.findByTestId("signal-card-note");
    fireEvent.change(note, { target: { value: "No corresponde, el registro sigue activo." } });
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Enter" });

    await waitFor(() => expect(decisionBody).not.toBeNull());
    expect(decisionBody).toEqual({
      decision: "descartar",
      note: "No corresponde, el registro sigue activo.",
    });
  });

  it("confirmar saca la tarjeta de la cola (la invalidación la refresca sin esa señal)", async () => {
    const signal = buildSignal();
    let listCalls = 0;
    server.use(
      http.get("/api/admin/family-search/signals", () => {
        listCalls += 1;
        return HttpResponse.json({ items: listCalls === 1 ? [signal] : [] });
      }),
      http.post("/api/admin/family-search/signals/signal-1/decision", () =>
        HttpResponse.json({
          item: { ...signal, status: "confirmed" },
          idempotentReplay: false,
        }),
      ),
    );
    withSession(<SignalQueue onOpenFicha={() => {}} />);
    await screen.findByTestId("signal-card");

    fireEvent.keyDown(document.body, { key: "1" });
    fireEvent.keyDown(document.body, { key: "Enter" });

    expect(await screen.findByText("No hay señales pendientes.")).toBeInTheDocument();
    expect(screen.queryByTestId("signal-card")).not.toBeInTheDocument();
  });

  it("un 409 real muestra 'decidida por otra persona' y avanza", async () => {
    const signal = buildSignal();
    server.use(
      http.get("/api/admin/family-search/signals", () => HttpResponse.json({ items: [signal] })),
      http.post("/api/admin/family-search/signals/signal-1/decision", () =>
        HttpResponse.json({ error: "Esta señal ya fue decidida por otro revisor." }, { status: 409 }),
      ),
    );
    withSession(<SignalQueue onOpenFicha={() => {}} />);
    await screen.findByTestId("signal-card");

    fireEvent.keyDown(document.body, { key: "1" });
    fireEvent.keyDown(document.body, { key: "Enter" });

    expect(await screen.findByText("Esta señal ya fue decidida por otra persona.")).toBeInTheDocument();
  });

  it("un 500 muestra un error inline reintentable (no el copy de conflicto)", async () => {
    const signal = buildSignal();
    server.use(
      http.get("/api/admin/family-search/signals", () => HttpResponse.json({ items: [signal] })),
      http.post("/api/admin/family-search/signals/signal-1/decision", () =>
        HttpResponse.json({ error: "Fallo interno del servidor." }, { status: 500 }),
      ),
    );
    withSession(<SignalQueue onOpenFicha={() => {}} />);
    await screen.findByTestId("signal-card");

    fireEvent.keyDown(document.body, { key: "1" });
    fireEvent.keyDown(document.body, { key: "Enter" });

    expect(await screen.findByText("Fallo interno del servidor.")).toBeInTheDocument();
    expect(screen.queryByText(/decidida por otra persona/)).not.toBeInTheDocument();
  });

  it("Enter en un campo FUERA de la tarjeta (p. ej. el buscador) NO comete la decisión armada", async () => {
    // Reproduce el bug real: SearchPanel se monta siempre por encima de la
    // tarjeta (family-search-admin.tsx) y también escucha Enter — sin el
    // guard de scope, un Enter en el buscador cometía la decisión armada de
    // la tarjeta de fondo. Mismo escenario que MatchCard.
    const signal = buildSignal();
    let calls = 0;
    let decisionBody: Record<string, unknown> | null = null;
    server.use(
      http.get("/api/admin/family-search/signals", () => HttpResponse.json({ items: [signal] })),
      http.post("/api/admin/family-search/signals/signal-1/decision", async ({ request }) => {
        calls += 1;
        decisionBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ item: { ...signal, status: "confirmed" }, idempotentReplay: false });
      }),
    );
    withSession(
      <>
        <input data-testid="outside-input" />
        <SignalQueue onOpenFicha={() => {}} />
      </>,
    );
    await screen.findByTestId("signal-card");

    fireEvent.keyDown(document.body, { key: "1" });
    const outsideInput = screen.getByTestId("outside-input");
    fireEvent.keyDown(outsideInput, { key: "Enter" });

    // Le da tiempo a una request que NO debería salir.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(calls).toBe(0);

    // La decisión sigue armada: un Enter DENTRO de scope (nada enfocado,
    // target === document.body) todavía comete "confirmar" — prueba que el
    // Enter de afuera no desarmó ni disparó nada.
    fireEvent.keyDown(document.body, { key: "Enter" });
    await waitFor(() => expect(decisionBody).not.toBeNull());
    expect(decisionBody).toEqual({ decision: "confirmar", note: undefined });
  });

  it("registro clusterizado: la tarjeta enlaza a la ficha del cluster", async () => {
    const signal = buildSignal({ record: { ...buildSignal().record!, clusterId: "cluster-1" } });
    server.use(
      http.get("/api/admin/family-search/signals", () => HttpResponse.json({ items: [signal] })),
      http.get("/api/admin/family-search/clusters/cluster-1", () =>
        HttpResponse.json({
          item: {
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
            ],
            decisions: [],
          },
        }),
      ),
    );
    let opened: unknown = null;
    withSession(<SignalQueue onOpenFicha={(target) => (opened = target)} />);
    await screen.findByTestId("signal-card");

    expect(await screen.findByText("Este registro tiene cluster")).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Ver ficha" }));
    expect(opened).toEqual({ type: "cluster", clusterId: "cluster-1" });
  });

  it("registro SIN cluster: la tarjeta renderiza el registro solo (sin enlace a ficha)", async () => {
    const signal = buildSignal(); // DEMO_RECORD_A.clusterId es null
    server.use(
      http.get("/api/admin/family-search/signals", () => HttpResponse.json({ items: [signal] })),
    );
    withSession(<SignalQueue onOpenFicha={() => {}} />);
    await screen.findByTestId("signal-card");

    expect(screen.queryByText("Este registro tiene cluster")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver ficha" })).not.toBeInTheDocument();
  });

  it("sin person:review las acciones de decisión están ocultas (solo lectura)", async () => {
    const signal = buildSignal();
    server.use(
      http.get("/api/admin/family-search/signals", () => HttpResponse.json({ items: [signal] })),
    );
    withSession(<SignalQueue onOpenFicha={() => {}} />, ["person:search"]);
    await screen.findByTestId("signal-card");

    expect(screen.queryByRole("button", { name: /Confirmar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Descartar/ })).not.toBeInTheDocument();
    expect(
      screen.getByText("No tienes permiso para decidir señales (person:review) — solo lectura."),
    ).toBeInTheDocument();
  });

  it("el atajo de teclado '1' + Enter NO dispara nada sin person:review", async () => {
    const signal = buildSignal();
    let calls = 0;
    server.use(
      http.get("/api/admin/family-search/signals", () => HttpResponse.json({ items: [signal] })),
      http.post("/api/admin/family-search/signals/signal-1/decision", () => {
        calls += 1;
        return HttpResponse.json({ item: { ...signal, status: "confirmed" }, idempotentReplay: false });
      }),
    );
    withSession(<SignalQueue onOpenFicha={() => {}} />, ["person:search"]);
    await screen.findByTestId("signal-card");

    fireEvent.keyDown(document.body, { key: "1" });
    fireEvent.keyDown(document.body, { key: "Enter" });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(calls).toBe(0);
  });
});
