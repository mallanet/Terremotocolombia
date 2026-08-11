import { HttpResponse, http } from "msw";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { server } from "@/tests/setup";
import { SearchPanel } from "@/src/contexts/family-search/search-panel";
import { withSession } from "./test-utils";

/**
 * PRNs de fixture con checksum REAL (mismo codec mod-37 de
 * `backend/src/lib/prn.ts`/`prn-format.ts`) — no strings inventados: un
 * carácter de control que no cuadra debe fallar de verdad, no por accidente.
 * Ver el informe de U11 para cómo se generaron (script puntual con el mismo
 * algoritmo).
 */
const PRN_UNREGISTERED = "TC-DEM00009~"; // bien formado, checksum correcto, sin fila en person_records.
const PRN_TOMBSTONED = "TC-DEM00008*"; // bien formado, checksum correcto, registro eliminado.
const PRN_BAD_CHECKSUM = "TC-DEM00009$"; // misma forma que PRN_UNREGISTERED, checksum ALTERADO.

async function submitSearch(value: string) {
  fireEvent.change(screen.getByLabelText("Buscar por PRN o nombre"), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
}

describe("SearchPanel — desenlaces de búsqueda por PRN", () => {
  it("PRN bien formado pero no registrado → 'PRN no encontrado'", async () => {
    let searchCalls = 0;
    server.use(
      http.get("/api/admin/family-search/records/search", () => {
        searchCalls += 1;
        return HttpResponse.json({ exactPrnMatch: null, results: [] });
      }),
    );
    withSession(<SearchPanel onOpenFicha={() => {}} />);

    await submitSearch(PRN_UNREGISTERED);

    expect(await screen.findByText("PRN no encontrado.")).toBeInTheDocument();
    expect(searchCalls).toBe(1);
  });

  it("PRN de un registro eliminado (tombstoneado) → 'registro eliminado'", async () => {
    server.use(
      http.get("/api/admin/family-search/records/search", () =>
        HttpResponse.json({
          exactPrnMatch: {
            prn: PRN_TOMBSTONED,
            recordType: "missing_report",
            name: "",
            age: null,
            population: "missing_report",
            source: "",
            outcome: "registro eliminado",
            clusterId: null,
          },
          results: [],
        }),
      ),
    );
    withSession(<SearchPanel onOpenFicha={() => {}} />);

    await submitSearch(PRN_TOMBSTONED);

    expect(
      await screen.findByText("Este PRN corresponde a un registro eliminado."),
    ).toBeInTheDocument();
  });

  it("PRN con forma correcta pero carácter de control alterado → error de formato, SIN llamar a la API", async () => {
    let searchCalls = 0;
    server.use(
      http.get("/api/admin/family-search/records/search", () => {
        searchCalls += 1;
        return HttpResponse.json({ exactPrnMatch: null, results: [] });
      }),
    );
    withSession(<SearchPanel onOpenFicha={() => {}} />);

    await submitSearch(PRN_BAD_CHECKSUM);

    expect(
      await screen.findByText(/Formato de PRN inválido/),
    ).toBeInTheDocument();
    expect(searchCalls).toBe(0);
  });

  it("un PRN válido y vigente abre la ficha directamente (sin quedarse en la búsqueda)", async () => {
    server.use(
      http.get("/api/admin/family-search/records/search", () =>
        HttpResponse.json({
          exactPrnMatch: {
            prn: PRN_UNREGISTERED,
            recordType: "missing_report",
            name: "Demo Encontrado",
            age: 22,
            population: "missing_report",
            source: "",
            outcome: null,
            clusterId: "cluster-9",
          },
          results: [],
        }),
      ),
    );
    let opened: unknown = null;
    withSession(<SearchPanel onOpenFicha={(target) => (opened = target)} />);

    await submitSearch(PRN_UNREGISTERED);

    await waitFor(() => expect(opened).toEqual({ type: "cluster", clusterId: "cluster-9" }));
  });

  it("una búsqueda por nombre sin resultados muestra 'Sin resultados'", async () => {
    server.use(
      http.get("/api/admin/family-search/records/search", () =>
        HttpResponse.json({ exactPrnMatch: null, results: [] }),
      ),
    );
    withSession(<SearchPanel onOpenFicha={() => {}} />);

    await submitSearch("Nombre Que No Existe");

    expect(await screen.findByText(/Sin resultados para/)).toBeInTheDocument();
  });
});
