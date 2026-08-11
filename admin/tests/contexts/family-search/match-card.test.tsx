import { HttpResponse, http } from "msw";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { server } from "@/tests/setup";
import { MatchCard } from "@/src/contexts/family-search/match-card";
import { buildQueueItem, withSession } from "./test-utils";

describe("MatchCard", () => {
  it("teclado: 1 + Enter dispara la mutación de confirmar", async () => {
    let decisionBody: Record<string, unknown> | null = null;
    const item = buildQueueItem();
    server.use(
      http.post("/api/admin/family-search/decision/link-1", async ({ request }) => {
        decisionBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ item: { ...item.link, status: "confirmed" }, idempotentReplay: false });
      }),
    );
    withSession(<MatchCard item={item} onAdvance={() => {}} />);
    await screen.findByTestId("match-card");

    fireEvent.keyDown(window, { key: "1" });
    fireEvent.keyDown(window, { key: "Enter" });

    await waitFor(() => expect(decisionBody).not.toBeNull());
    expect(decisionBody).toEqual({ decision: "confirmar", note: undefined });
  });

  it("teclado: 3 sin nota bloquea el commit (ninguna request sale)", async () => {
    let calls = 0;
    const item = buildQueueItem();
    server.use(
      http.post("/api/admin/family-search/decision/link-1", () => {
        calls += 1;
        return HttpResponse.json({ item: { ...item.link, status: "unsure" }, idempotentReplay: false });
      }),
    );
    withSession(<MatchCard item={item} onAdvance={() => {}} />);
    await screen.findByTestId("match-card");

    fireEvent.keyDown(document.body, { key: "3" });
    // El foco saltó a la nota (autofocus del "3") — el Enter real del
    // usuario ocurre CON ese foco puesto ahí, no en el body.
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Enter" });

    expect(
      await screen.findByText("La nota es obligatoria para marcar un vínculo como inseguro."),
    ).toBeInTheDocument();
    // Le da tiempo a una request que NO debería salir.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(calls).toBe(0);
  });

  it("teclado: 3 + nota + Enter SÍ dispara el commit con la nota", async () => {
    let decisionBody: Record<string, unknown> | null = null;
    const item = buildQueueItem();
    server.use(
      http.post("/api/admin/family-search/decision/link-1", async ({ request }) => {
        decisionBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ item: { ...item.link, status: "unsure" }, idempotentReplay: false });
      }),
    );
    withSession(<MatchCard item={item} onAdvance={() => {}} />);
    await screen.findByTestId("match-card");

    fireEvent.keyDown(document.body, { key: "3" });
    const note = await screen.findByTestId("match-card-note");
    fireEvent.change(note, { target: { value: "No coinciden las cicatrices descritas." } });
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Enter" });

    await waitFor(() => expect(decisionBody).not.toBeNull());
    expect(decisionBody).toEqual({
      decision: "inseguro",
      note: "No coinciden las cicatrices descritas.",
    });
  });

  it("un 409 real muestra 'decidida por otra persona' y avanza (onAdvance se llama)", async () => {
    const item = buildQueueItem();
    server.use(
      http.post("/api/admin/family-search/decision/link-1", () =>
        HttpResponse.json({ error: "Este vínculo ya fue decidido por otro revisor." }, { status: 409 }),
      ),
    );
    let advanced = 0;
    withSession(<MatchCard item={item} onAdvance={() => (advanced += 1)} />);
    await screen.findByTestId("match-card");

    fireEvent.keyDown(window, { key: "1" });
    fireEvent.keyDown(window, { key: "Enter" });

    expect(await screen.findByText("Esta propuesta ya fue decidida por otra persona.")).toBeInTheDocument();
    await waitFor(() => expect(advanced).toBeGreaterThan(0), { timeout: 3000 });
  });

  it("un 500 muestra un error inline reintentable (no el copy de conflicto)", async () => {
    const item = buildQueueItem();
    server.use(
      http.post("/api/admin/family-search/decision/link-1", () =>
        HttpResponse.json({ error: "Fallo interno del servidor." }, { status: 500 }),
      ),
    );
    withSession(<MatchCard item={item} onAdvance={() => {}} />);
    await screen.findByTestId("match-card");

    fireEvent.keyDown(window, { key: "1" });
    fireEvent.keyDown(window, { key: "Enter" });

    expect(await screen.findByText("Fallo interno del servidor.")).toBeInTheDocument();
    expect(screen.queryByText(/decidida por otra persona/)).not.toBeInTheDocument();
  });

  it("un replay idempotente (200) se trata como éxito y avanza igual que un éxito normal", async () => {
    const item = buildQueueItem();
    server.use(
      http.post("/api/admin/family-search/decision/link-1", () =>
        HttpResponse.json({ item: { ...item.link, status: "confirmed" }, idempotentReplay: true }),
      ),
    );
    let advanced = 0;
    withSession(<MatchCard item={item} onAdvance={() => (advanced += 1)} />);
    await screen.findByTestId("match-card");

    fireEvent.keyDown(window, { key: "1" });
    fireEvent.keyDown(window, { key: "Enter" });

    await waitFor(() => expect(advanced).toBe(1));
    // Éxito real, no el copy de conflicto.
    expect(screen.queryByText(/decidida por otra persona/)).not.toBeInTheDocument();
  });

  it("el banner de re-propuesta se muestra cuando hay priorRejection", async () => {
    const item = buildQueueItem({
      priorRejection: {
        id: "dec-1",
        linkId: "link-1",
        prnA: "TC-DEMO0001X",
        prnB: "TC-DEMO0002Y",
        decision: "rejected",
        note: "Documentos distintos.",
        evidenceSnapshot: { evidenceClass: "name_age_exact", score: 0.75 },
        decidedBy: "u2",
        decidedAt: 500,
      },
    });
    withSession(<MatchCard item={item} onAdvance={() => {}} />);

    expect(await screen.findByText(/Rechazado antes/)).toBeInTheDocument();
    expect(screen.getByText(/nueva evidencia/)).toBeInTheDocument();
    expect(screen.getByText(/Documentos distintos\./)).toBeInTheDocument();
  });
});
