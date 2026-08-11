import { HttpResponse, http } from "msw";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { server } from "@/tests/setup";
import { MatchCard } from "@/src/contexts/family-search/match-card";
import { buildQueueItem, withSession } from "./test-utils";

const ANCHORED_MESSAGE =
  "Esta confirmación uniría dos clusters que ya tienen identidad propia (fusión anclada). Se requiere el permiso person:merge para completarla.";

describe("Escalación de fusión anclada (R18)", () => {
  it("el 403 anclado abre el modal de ambos clusters", async () => {
    const item = buildQueueItem();
    let decisionCalls = 0;
    server.use(
      http.post("/api/admin/family-search/decision/link-1", () => {
        decisionCalls += 1;
        return HttpResponse.json({ error: ANCHORED_MESSAGE }, { status: 403 });
      }),
    );
    withSession(<MatchCard item={item} onAdvance={() => {}} />);
    await screen.findByTestId("match-card");

    fireEvent.keyDown(document.body, { key: "1" });
    fireEvent.keyDown(document.body, { key: "Enter" });

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByText("Fusión anclada — se requiere confirmación adicional"),
    ).toBeInTheDocument();
    expect(decisionCalls).toBe(1);
  });

  it("Escape cierra el modal sin disparar ninguna mutación adicional", async () => {
    const item = buildQueueItem();
    let decisionCalls = 0;
    server.use(
      http.post("/api/admin/family-search/decision/link-1", () => {
        decisionCalls += 1;
        return HttpResponse.json({ error: ANCHORED_MESSAGE }, { status: 403 });
      }),
    );
    withSession(<MatchCard item={item} onAdvance={() => {}} />);
    await screen.findByTestId("match-card");
    fireEvent.keyDown(document.body, { key: "1" });
    fireEvent.keyDown(document.body, { key: "Enter" });
    await screen.findByRole("dialog");
    expect(decisionCalls).toBe(1);

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    // El intento original ya había salido (1); cerrar con Escape NO agrega uno más.
    expect(decisionCalls).toBe(1);
  });

  it("Cancelar cierra el modal sin disparar ninguna mutación adicional", async () => {
    const item = buildQueueItem();
    let decisionCalls = 0;
    server.use(
      http.post("/api/admin/family-search/decision/link-1", () => {
        decisionCalls += 1;
        return HttpResponse.json({ error: ANCHORED_MESSAGE }, { status: 403 });
      }),
    );
    withSession(<MatchCard item={item} onAdvance={() => {}} />);
    await screen.findByTestId("match-card");
    fireEvent.keyDown(document.body, { key: "1" });
    fireEvent.keyDown(document.body, { key: "Enter" });
    await screen.findByRole("dialog");

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(decisionCalls).toBe(1);
  });

  it("el botón de confirmar dentro del modal está oculto sin person:merge", async () => {
    const item = buildQueueItem();
    server.use(
      http.post("/api/admin/family-search/decision/link-1", () =>
        HttpResponse.json({ error: ANCHORED_MESSAGE }, { status: 403 }),
      ),
    );
    withSession(<MatchCard item={item} onAdvance={() => {}} />, ["person:search", "person:review"]);
    await screen.findByTestId("match-card");
    fireEvent.keyDown(document.body, { key: "1" });
    fireEvent.keyDown(document.body, { key: "Enter" });

    await screen.findByRole("dialog");
    expect(screen.queryByRole("button", { name: "Confirmar fusión anclada" })).not.toBeInTheDocument();
    expect(
      screen.getByText("No tienes permiso para completar una fusión anclada (person:merge)."),
    ).toBeInTheDocument();
    // Cancelar sigue disponible incluso sin person:merge.
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });

  it("con person:merge el botón de confirmar SÍ aparece y reintenta la decisión", async () => {
    const item = buildQueueItem();
    let decisionCalls = 0;
    server.use(
      http.post("/api/admin/family-search/decision/link-1", () => {
        decisionCalls += 1;
        if (decisionCalls === 1) {
          return HttpResponse.json({ error: ANCHORED_MESSAGE }, { status: 403 });
        }
        return HttpResponse.json({ item: { ...item.link, status: "confirmed" }, idempotentReplay: false });
      }),
    );
    withSession(<MatchCard item={item} onAdvance={() => {}} />);
    await screen.findByTestId("match-card");
    fireEvent.keyDown(document.body, { key: "1" });
    fireEvent.keyDown(document.body, { key: "Enter" });
    await screen.findByRole("dialog");

    fireEvent.click(screen.getByRole("button", { name: "Confirmar fusión anclada" }));

    await waitFor(() => expect(decisionCalls).toBe(2));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
