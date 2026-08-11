import { HttpResponse, http } from "msw";
import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { server } from "@/tests/setup";
import { withSession } from "@/tests/contexts/family-search/test-utils";
import { Shell } from "@/app/shell";

/**
 * U15 — badge de señales pendientes en "Búsqueda de familias"
 * (discoverability, R26/AE4). Reusa `withSession` de family-search (mismo
 * shape de AdminSessionContext) en vez de duplicarlo — ver ese archivo.
 */
describe("Shell — nav badge de señales pendientes", () => {
  it("con señales pendientes, el link de Búsqueda de familias muestra el conteo", async () => {
    server.use(
      http.get("/api/admin/family-search/signals", () =>
        HttpResponse.json({
          items: [
            { id: "s1", prn: "TC-1", source: "partner:demo", kind: "status_report", claimedStatus: "found", storedStatus: "active", payload: {}, createdAt: 1, record: null },
            { id: "s2", prn: "TC-2", source: "partner:demo", kind: "status_report", claimedStatus: "found", storedStatus: "active", payload: {}, createdAt: 2, record: null },
            { id: "s3", prn: "TC-3", source: "partner:demo", kind: "status_report", claimedStatus: "found", storedStatus: "active", payload: {}, createdAt: 3, record: null },
          ],
        }),
      ),
    );
    withSession(<Shell>contenido</Shell>, ["person:search"]);

    const badge = await screen.findByTestId("nav-pending-signals-badge");
    expect(badge).toHaveTextContent("3");
  });

  it("cero señales pendientes → sin badge (el link sigue visible)", async () => {
    let calls = 0;
    server.use(
      http.get("/api/admin/family-search/signals", () => {
        calls += 1;
        return HttpResponse.json({ items: [] });
      }),
    );
    withSession(<Shell>contenido</Shell>, ["person:search"]);

    expect(await screen.findByText("Búsqueda de familias")).toBeInTheDocument();
    await waitFor(() => expect(calls).toBeGreaterThan(0));
    expect(screen.queryByTestId("nav-pending-signals-badge")).not.toBeInTheDocument();
  });

  it("señales pendientes al límite de la página → overflow '9+' (el conteo real es desconocido)", async () => {
    server.use(
      http.get("/api/admin/family-search/signals", () =>
        HttpResponse.json({
          items: Array.from({ length: 10 }, (_, i) => ({
            id: `s${i}`,
            prn: `TC-${i}`,
            source: "partner:demo",
            kind: "status_report",
            claimedStatus: "found",
            storedStatus: "active",
            payload: {},
            createdAt: i,
            record: null,
          })),
        }),
      ),
    );
    withSession(<Shell>contenido</Shell>, ["person:search"]);

    expect(await screen.findByTestId("nav-pending-signals-badge")).toHaveTextContent("9+");
  });

  it("sin person:search no aparece el link ni se dispara la query de señales", async () => {
    let calls = 0;
    server.use(
      http.get("/api/admin/family-search/signals", () => {
        calls += 1;
        return HttpResponse.json({ items: [] });
      }),
    );
    withSession(<Shell>contenido</Shell>, []);

    expect(await screen.findByText("contenido")).toBeInTheDocument();
    expect(screen.queryByText("Búsqueda de familias")).not.toBeInTheDocument();
    expect(calls).toBe(0);
  });
});
