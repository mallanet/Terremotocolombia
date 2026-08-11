import { HttpResponse, http } from "msw";
import { screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { server } from "@/tests/setup";
import { RequireCapability } from "@/src/shared/auth/admin-gate";
import { FamilySearchAdmin } from "@/src/contexts/family-search/family-search-admin";
import { MatchCard } from "@/src/contexts/family-search/match-card";
import { buildQueueItem, withSession } from "./test-utils";

/** Mismo gate que `app/family-search/page.tsx` — se reproduce aquí en vez de
 *  renderizar el page.tsx real (server component con Metadata/Shell, fuera
 *  del patrón de test de este repo: ni patient-imports ni audit prueban su
 *  page.tsx directamente, prueban el componente admin interior). */
function FamilySearchPageLikeGate() {
  return (
    <RequireCapability
      cap="person:search"
      fallback={<p className="text-sm text-red-600">No tienes permiso (person:search).</p>}
    >
      <FamilySearchAdmin />
    </RequireCapability>
  );
}

describe("Family Search — gating por capacidad", () => {
  it("sin person:search la página completa se bloquea (fallback, sin montar la cola NI el panel de señales)", async () => {
    let queueCalls = 0;
    let signalsCalls = 0;
    server.use(
      http.get("/api/admin/family-search/queue", () => {
        queueCalls += 1;
        return HttpResponse.json({ items: [] });
      }),
      http.get("/api/admin/family-search/signals", () => {
        signalsCalls += 1;
        return HttpResponse.json({ items: [] });
      }),
    );
    withSession(<FamilySearchPageLikeGate />, []);

    expect(await screen.findByText("No tienes permiso (person:search).")).toBeInTheDocument();
    expect(screen.queryByText("Búsqueda de familias")).not.toBeInTheDocument();
    // U15: el panel "Señales" es una pestaña hermana DENTRO de FamilySearchAdmin
    // — el mismo gate de página (person:search) lo cubre, así que ni su tab
    // ni su query deberían montar.
    expect(screen.queryByText("Señales")).not.toBeInTheDocument();
    expect(queueCalls).toBe(0);
    expect(signalsCalls).toBe(0);
  });

  it("con person:search la página se ve normal (cola visible)", async () => {
    server.use(http.get("/api/admin/family-search/queue", () => HttpResponse.json({ items: [] })));
    withSession(<FamilySearchPageLikeGate />, ["person:search"]);

    expect(await screen.findByText("Búsqueda de familias")).toBeInTheDocument();
    expect(await screen.findByText("No hay propuestas pendientes.")).toBeInTheDocument();
  });

  it("con person:search, la pestaña 'Señales' también es accesible (cambia de vista sin recargar la página)", async () => {
    server.use(
      http.get("/api/admin/family-search/queue", () => HttpResponse.json({ items: [] })),
      http.get("/api/admin/family-search/signals", () => HttpResponse.json({ items: [] })),
    );
    withSession(<FamilySearchPageLikeGate />, ["person:search"]);

    await screen.findByText("No hay propuestas pendientes.");
    fireEvent.click(screen.getByRole("tab", { name: "Señales" }));

    expect(await screen.findByText("No hay señales pendientes.")).toBeInTheDocument();
  });

  it("sin person:review las acciones de decisión de la tarjeta están ocultas (solo lectura)", async () => {
    const item = buildQueueItem();
    withSession(<MatchCard item={item} onAdvance={() => {}} />, ["person:search"]);

    await screen.findByTestId("match-card");
    expect(screen.queryByRole("button", { name: /Confirmar coincidencia/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /No es la misma persona/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /No estoy seguro/ })).not.toBeInTheDocument();
    expect(
      screen.getByText("No tienes permiso para decidir vínculos (person:review) — solo lectura."),
    ).toBeInTheDocument();
  });

  it("el atajo de teclado '1' + Enter NO dispara nada sin person:review", async () => {
    let calls = 0;
    const item = buildQueueItem();
    server.use(
      http.post("/api/admin/family-search/decision/link-1", () => {
        calls += 1;
        return HttpResponse.json({ item: { ...item.link, status: "confirmed" }, idempotentReplay: false });
      }),
    );
    withSession(<MatchCard item={item} onAdvance={() => {}} />, ["person:search"]);
    await screen.findByTestId("match-card");

    fireEvent.keyDown(document.body, { key: "1" });
    fireEvent.keyDown(document.body, { key: "Enter" });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(calls).toBe(0);
  });

  it("con person:review las acciones SÍ están visibles", async () => {
    const item = buildQueueItem();
    withSession(<MatchCard item={item} onAdvance={() => {}} />, ["person:search", "person:review"]);

    expect(await screen.findByRole("button", { name: /Confirmar coincidencia/ })).toBeInTheDocument();
  });
});
