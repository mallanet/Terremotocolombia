import { HttpResponse, http } from "msw";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { server } from "@/tests/setup";
import { ReviewQueue } from "@/src/contexts/family-search/review-queue";
import { buildQueueItem, withSession } from "./test-utils";

describe("ReviewQueue", () => {
  it("renderiza la propuesta activa con sus chips de evidencia y las próximas en vista previa", async () => {
    const active = buildQueueItem({ link: { id: "link-1", proposedAt: 2000 } });
    const upcoming = buildQueueItem({
      link: { id: "link-2", proposedAt: 1000 },
      a: { ...active.a!, prn: "TC-DEMO0003Z", name: "Demo Tres" },
    });
    server.use(
      http.get("/api/admin/family-search/queue", () =>
        HttpResponse.json({ items: [active, upcoming] }),
      ),
    );
    withSession(<ReviewQueue onOpenFicha={() => {}} />);

    expect(await screen.findByTestId("match-card")).toBeInTheDocument();
    // Chips de evidencia de la tarjeta activa (nombre+edad exactos).
    expect(screen.getAllByText("Nombre: coincide").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Edad: coincide").length).toBeGreaterThan(0);
    // La segunda propuesta aparece como vista previa (con nombre y chips),
    // sin las acciones de decisión. El nombre vive en el mismo <span> que el
    // de "Registro B" ("Demo Tres — Demo Dos"), así que se matchea por
    // substring (RTL exige texto EXACTO del nodo completo si no es regex).
    expect(await screen.findByText(/Demo Tres/)).toBeInTheDocument();
    expect(screen.getAllByTestId("queue-preview-item")).toHaveLength(1);
  });

  it("carga más vía cursor keyset y las agrega a la lista", async () => {
    const page1Items = Array.from({ length: 25 }, (_, i) =>
      buildQueueItem({
        link: { id: `link-p1-${i}`, proposedAt: 5000 - i },
        a: { ...buildQueueItem().a!, prn: `TC-P1-${i}`, name: `Demo P1 ${i}` },
      }),
    );
    const page2Item = buildQueueItem({
      link: { id: "link-p2-0", proposedAt: 100 },
      a: { ...buildQueueItem().a!, prn: "TC-P2-0", name: "Demo Página Dos" },
    });

    let queueCalls = 0;
    server.use(
      http.get("/api/admin/family-search/queue", ({ request }) => {
        queueCalls += 1;
        const url = new URL(request.url);
        const before = url.searchParams.get("before");
        if (!before) return HttpResponse.json({ items: page1Items });
        return HttpResponse.json({ items: [page2Item] });
      }),
    );
    withSession(<ReviewQueue onOpenFicha={() => {}} />);

    await screen.findByTestId("match-card");
    const loadMore = await screen.findByRole("button", { name: "Cargar más" });
    fireEvent.click(loadMore);

    await waitFor(() => expect(queueCalls).toBe(2));
    // Mismo motivo que arriba: el nombre comparte <span> con "Demo Dos".
    expect(await screen.findByText(/Demo Página Dos/)).toBeInTheDocument();
  });

  it("cola vacía muestra 'No hay propuestas pendientes.' (distinto del loading)", async () => {
    server.use(http.get("/api/admin/family-search/queue", () => HttpResponse.json({ items: [] })));
    withSession(<ReviewQueue onOpenFicha={() => {}} />);

    // Estado de carga primero — texto distinto del vacío.
    expect(screen.getByText("Cargando cola de revisión…")).toBeInTheDocument();
    expect(screen.queryByText("No hay propuestas pendientes.")).not.toBeInTheDocument();

    expect(await screen.findByText("No hay propuestas pendientes.")).toBeInTheDocument();
  });
});
