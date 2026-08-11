import type { ReactNode } from "react";
import { HttpResponse, http } from "msw";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { server } from "@/tests/setup";
import { renderWithProviders } from "@/tests/_utils/render-with-providers";
import { ImportRowsTable } from "@/src/contexts/patient-imports/import-rows-table";
import { AdminSessionContext } from "@/src/shared/auth/admin-session-context";

// El editor monta el picker de hospital destino (GET /api/models/hospitals)
// SIEMPRE — el hook corre antes del chequeo de capacidad — así que todo test
// que expanda una fila necesita este handler, con o sin patient:import.
const hospitalsHandler = http.get("/api/models/hospitals", () =>
  HttpResponse.json([{ id: "h1", name: "Hosp Demo" }]),
);

function withSession(ui: ReactNode, capabilities: string[] = ["patient:import"]) {
  return renderWithProviders(
    <AdminSessionContext.Provider
      value={{
        user: { id: "u", email: "demo@example.test", roleId: null, orgId: null, isAdmin: false },
        capabilities,
        isLoading: false,
        sessionCheckFailed: false,
        retrySessionCheck: () => {},
        login: async () => {},
        logout: async () => {},
        can: (capability) => capabilities.includes(capability),
      }}
    >
      {ui}
    </AdminSessionContext.Provider>,
  );
}

const baseRow = {
  id: "r1",
  rowIndex: 0,
  name: "Demo Uno",
  age: 30,
  condition: "stable",
  status: "hospitalized",
  sourceHospital: "Hosp Demo",
  hospitalId: "h1",
  rowStatus: "needs_review",
  dedupStatus: "pending",
  validationErrors: [] as string[],
  validationWarnings: [] as string[],
  dedupCandidates: [] as { patientId: string; name: string; reason: string }[],
  patientId: null as string | null,
  // Baseline de concurrencia optimista — ver `row-editor.tsx` y
  // `editImportRow` (backend rows.ts). El PATCH real la reenvía como
  // `baselineUpdatedAt`; el test de abajo verifica exactamente ese cableado.
  updatedAt: 1000,
};

async function expandRow(): Promise<void> {
  fireEvent.click(await screen.findByRole("button", { name: "Editar" }));
}

describe("RowEditor (vía ImportRowsTable)", () => {
  it("expande en el editor; guardar envía baselineUpdatedAt y re-renderiza el nuevo estado de la respuesta", async () => {
    let patchBody: Record<string, unknown> | null = null;
    server.use(
      hospitalsHandler,
      http.get("/api/admin/patient-imports/imp-1/rows", () =>
        HttpResponse.json({ items: [baseRow] }),
      ),
      http.patch("/api/admin/patient-imports/imp-1/rows/r1", async ({ request }) => {
        patchBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          row: { ...baseRow, name: "Demo Editado", rowStatus: "valid", updatedAt: 2000 },
        });
      }),
    );
    withSession(<ImportRowsTable importId="imp-1" />);

    await expandRow();
    const nameInput = await screen.findByLabelText("Nombre");
    fireEvent.change(nameInput, { target: { value: "Demo Editado" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(patchBody).not.toBeNull());
    // El corazón del contract update: la baseline enviada es EXACTAMENTE el
    // updatedAt que la fila traía al renderizarse (1000), no un valor
    // inventado en el cliente.
    expect(patchBody!.baselineUpdatedAt).toBe(1000);
    expect(patchBody!.name).toBe("Demo Editado");

    expect(await screen.findByTestId("row-editor-status")).toHaveTextContent("Válida");
  });

  it("confirmar y rechazar llaman sus endpoints y actualizan el chip de estado de la fila", async () => {
    let confirmCalls = 0;
    let rejectCalls = 0;
    server.use(
      hospitalsHandler,
      http.get("/api/admin/patient-imports/imp-2/rows", () =>
        HttpResponse.json({ items: [{ ...baseRow, id: "r2" }] }),
      ),
      http.post("/api/admin/patient-imports/imp-2/rows/r2/confirm", () => {
        confirmCalls += 1;
        return HttpResponse.json({ row: { ...baseRow, id: "r2", rowStatus: "valid", updatedAt: 1100 } });
      }),
      http.post("/api/admin/patient-imports/imp-2/rows/r2/reject", () => {
        rejectCalls += 1;
        return HttpResponse.json({ row: { ...baseRow, id: "r2", rowStatus: "invalid", updatedAt: 1200 } });
      }),
    );
    withSession(<ImportRowsTable importId="imp-2" />);

    await expandRow();
    fireEvent.click(await screen.findByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(confirmCalls).toBe(1));
    expect(await screen.findByTestId("row-editor-status")).toHaveTextContent("Válida");

    // "valid" también admite Rechazar (needs_review|valid → invalid).
    fireEvent.click(screen.getByRole("button", { name: "Rechazar" }));
    await waitFor(() => expect(rejectCalls).toBe(1));
    expect(await screen.findByTestId("row-editor-status")).toHaveTextContent("Inválida");
  });

  it("aceptar un candidato de dedup postea su patientId", async () => {
    let dedupBody: Record<string, unknown> | null = null;
    const dupRow = {
      ...baseRow,
      id: "r4",
      rowStatus: "duplicate",
      dedupStatus: "duplicate",
      dedupCandidates: [{ patientId: "p9", name: "Original Demo", reason: "document_hash exacto" }],
    };
    server.use(
      hospitalsHandler,
      http.get("/api/admin/patient-imports/imp-4/rows", () => HttpResponse.json({ items: [dupRow] })),
      http.post("/api/admin/patient-imports/imp-4/rows/r4/dedup", async ({ request }) => {
        dedupBody = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({
          row: {
            ...dupRow,
            rowStatus: "valid",
            dedupCandidates: [{ patientId: "p9", name: "Original Demo", reason: "accepted_by_reviewer" }],
            updatedAt: 1300,
          },
        });
      }),
    );
    withSession(<ImportRowsTable importId="imp-4" />);

    await expandRow();
    // El aviso de duplicado aparece legítimamente dos veces: el chip de la
    // tabla y la línea del editor — se afirma presencia, no unicidad.
    expect((await screen.findAllByText(/posible duplicado de/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Original Demo/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Aceptar" }));
    await waitFor(() => expect(dedupBody).not.toBeNull());
    expect(dedupBody).toEqual({ accept: true, patientId: "p9" });
  });

  it("rechazar los candidatos de dedup limpia la lista", async () => {
    let dedupBody: Record<string, unknown> | null = null;
    const dupRow = {
      ...baseRow,
      id: "r5",
      rowStatus: "duplicate",
      dedupStatus: "duplicate",
      dedupCandidates: [{ patientId: "p9", name: "Original Demo", reason: "document_hash exacto" }],
    };
    // Handler con estado: tras el rechazo, el refetch (invalidación de la
    // query) devuelve la fila YA limpia — igual que haría el backend real.
    let rejected = false;
    server.use(
      hospitalsHandler,
      http.get("/api/admin/patient-imports/imp-5/rows", () =>
        HttpResponse.json({
          items: [
            rejected
              ? { ...dupRow, rowStatus: "valid", dedupStatus: "unique", dedupCandidates: [], updatedAt: 1400 }
              : dupRow,
          ],
        }),
      ),
      http.post("/api/admin/patient-imports/imp-5/rows/r5/dedup", async ({ request }) => {
        dedupBody = (await request.json()) as Record<string, unknown>;
        rejected = true;
        return HttpResponse.json({
          row: { ...dupRow, rowStatus: "valid", dedupStatus: "unique", dedupCandidates: [], updatedAt: 1400 },
        });
      }),
    );
    withSession(<ImportRowsTable importId="imp-5" />);

    await expandRow();
    fireEvent.click(await screen.findByRole("button", { name: "No es duplicado" }));
    await waitFor(() => expect(dedupBody).toEqual({ accept: false }));
    await waitFor(() =>
      expect(screen.queryByText(/posible duplicado de/)).not.toBeInTheDocument(),
    );
  });

  it("un 409 de edición concurrente muestra 'modificada por otra persona' y refresca la lista", async () => {
    let getRowsCalls = 0;
    server.use(
      hospitalsHandler,
      http.get("/api/admin/patient-imports/imp-6/rows", () => {
        getRowsCalls += 1;
        const row =
          getRowsCalls === 1
            ? { ...baseRow, id: "r6" }
            : { ...baseRow, id: "r6", name: "Editado Por Otra Persona", updatedAt: 9999 };
        return HttpResponse.json({ items: [row] });
      }),
      http.patch("/api/admin/patient-imports/imp-6/rows/r6", () =>
        HttpResponse.json(
          { error: "La fila cambió desde que la leíste (edición concurrente); recárgala e inténtalo de nuevo." },
          { status: 409 },
        ),
      ),
    );
    withSession(<ImportRowsTable importId="imp-6" />);

    await expandRow();
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText(/modificada por otra persona/)).toBeInTheDocument();
    await waitFor(() => expect(getRowsCalls).toBeGreaterThan(1));
  });

  it("una mutación pendiente deshabilita el botón (segundo click no hace nada); un 500 muestra error reintentable, no el de conflicto", async () => {
    let patchCalls = 0;
    // Inicializado a no-op (no a null): TS no puede ordenar la asignación
    // dentro del executor de la Promise y estrecharía el tipo a null/never.
    let resolvePatch: () => void = () => {};
    server.use(
      hospitalsHandler,
      http.get("/api/admin/patient-imports/imp-7/rows", () =>
        HttpResponse.json({ items: [{ ...baseRow, id: "r7" }] }),
      ),
      http.patch("/api/admin/patient-imports/imp-7/rows/r7", async () => {
        patchCalls += 1;
        await new Promise<void>((resolve) => {
          resolvePatch = resolve;
        });
        return HttpResponse.json({ error: "Fallo interno del servidor." }, { status: 500 });
      }),
    );
    withSession(<ImportRowsTable importId="imp-7" />);

    await expandRow();
    const saveButton = screen.getByRole("button", { name: "Guardar cambios" });
    fireEvent.click(saveButton);

    await waitFor(() => expect(saveButton).toBeDisabled());
    // Segundo click mientras está en vuelo: un botón disabled no dispara su
    // onClick — no debe generar una segunda llamada al PATCH.
    fireEvent.click(saveButton);

    resolvePatch();
    await waitFor(() => expect(patchCalls).toBe(1));
    expect(await screen.findByText("Fallo interno del servidor.")).toBeInTheDocument();
    expect(screen.queryByText(/modificada por otra persona/)).not.toBeInTheDocument();
  });

  it("sin la capacidad patient:import se ocultan los botones de acción", async () => {
    server.use(
      hospitalsHandler,
      http.get("/api/admin/patient-imports/imp-8/rows", () =>
        HttpResponse.json({ items: [{ ...baseRow, id: "r8" }] }),
      ),
    );
    withSession(<ImportRowsTable importId="imp-8" />, []);

    await expandRow();
    expect(
      await screen.findByText(/No tienes permiso para editar esta fila/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirmar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rechazar" })).not.toBeInTheDocument();
  });

  it("muestra la imagen fuente junto al formulario cuando el lote la trae (GET /:id.sourceImageUrl)", async () => {
    server.use(
      hospitalsHandler,
      http.get("/api/admin/patient-imports/imp-9/rows", () =>
        HttpResponse.json({ items: [{ ...baseRow, id: "r9" }] }),
      ),
    );
    withSession(
      <ImportRowsTable importId="imp-9" sourceImageUrl="https://cdn.example.test/lote-9.jpg" />,
    );

    await expandRow();
    const image = await screen.findByRole("img");
    expect(image).toHaveAttribute("src", "https://cdn.example.test/lote-9.jpg");
  });

  it("no muestra imagen cuando el lote no es OCR (sourceImageUrl: null)", async () => {
    server.use(
      hospitalsHandler,
      http.get("/api/admin/patient-imports/imp-10/rows", () =>
        HttpResponse.json({ items: [{ ...baseRow, id: "r10" }] }),
      ),
    );
    withSession(<ImportRowsTable importId="imp-10" sourceImageUrl={null} />);

    await expandRow();
    await screen.findByTestId("row-editor-status");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
