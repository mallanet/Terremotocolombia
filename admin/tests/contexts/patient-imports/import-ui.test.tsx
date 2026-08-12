import type { ReactNode } from "react";
import { HttpResponse, http } from "msw";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { server } from "@/tests/setup";
import { renderWithProviders } from "@/tests/_utils/render-with-providers";
import { PatientImportsAdmin } from "@/src/contexts/patient-imports/patient-imports-admin";
import { ImportRowsTable } from "@/src/contexts/patient-imports/import-rows-table";
import { AdminSessionContext } from "@/src/shared/auth/admin-session-context";

function withSession(ui: ReactNode) {
  const capabilities = ["patient:import"];
  return renderWithProviders(
    <AdminSessionContext.Provider
      value={{
        user: { id: "u", email: "demo@example.test", roleId: null, orgId: null, isAdmin: false },
        capabilities,
        isLoading: false,
        sessionCheckFailed: false,
        retrySessionCheck: () => {},
        login: vi.fn(),
        logout: vi.fn(),
        can: (capability) => capabilities.includes(capability),
      }}
    >
      {ui}
    </AdminSessionContext.Provider>,
  );
}

// El formulario monta el picker de hospital destino (GET /api/models/hospitals):
// todo test que renderice PatientImportsAdmin necesita este handler.
const hospitalsHandler = http.get("/api/models/hospitals", () =>
  HttpResponse.json([
    { id: "h1", name: "Hosp Demo" },
    { id: "h2", name: "Hosp Beta" },
  ]),
);

describe("PatientImportsAdmin — archivo", () => {
  it("sube un CSV como base64 con el hospital destino estampado en el body", async () => {
    let received: Record<string, unknown> | null = null;
    server.use(
      hospitalsHandler,
      http.post("/api/admin/patient-imports", async ({ request }) => {
        received = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          {
            import: {
              id: "imp-1",
              status: "queued",
              failedStage: null,
              errorSummary: null,
              counts: {},
            },
          },
          { status: 202 },
        );
      }),
      http.get("/api/admin/patient-imports/imp-1", () =>
        HttpResponse.json({
          import: {
            id: "imp-1",
            status: "queued",
            failedStage: null,
            errorSummary: null,
            counts: {},
          },
        }),
      ),
    );
    withSession(<PatientImportsAdmin />);

    const select = await screen.findByLabelText(/Hospital destino/);
    await screen.findByRole("option", { name: "Hosp Demo" });
    fireEvent.change(select, { target: { value: "h1" } });

    const fileInput = screen.getByLabelText(/Archivo \(CSV o XLSX/);
    const csv = new File(["name\nDemo Uno\n"], "lote.csv", {
      type: "text/csv",
    });
    fireEvent.change(fileInput, { target: { files: [csv] } });
    fireEvent.click(screen.getByRole("button", { name: "Crear lote" }));

    await waitFor(() => expect(received).not.toBeNull());
    expect(received!.contentType).toBe("text/csv");
    expect(typeof received!.fileBase64).toBe("string");
    expect((received!.fileBase64 as string).length).toBeGreaterThan(0);
    expect(received!.rows).toBeUndefined();
    expect(received!.defaultHospitalId).toBe("h1");
  });

  it("sin hospital destino el submit queda bloqueado", async () => {
    server.use(hospitalsHandler);
    withSession(<PatientImportsAdmin />);

    await screen.findByLabelText(/Hospital destino/);
    // Sin hospital elegido, el botón está deshabilitado: no puede salir un
    // lote sin destino (el backend igualmente lo estampa por lote, no por fila).
    expect(screen.getByRole("button", { name: "Crear lote" })).toBeDisabled();
  });

  it("muestra el botón de aplicar cuando el lote está processed", async () => {
    server.use(
      hospitalsHandler,
      http.get("/api/admin/patient-imports/imp-2", () =>
        HttpResponse.json({
          import: {
            id: "imp-2",
            status: "processed",
            failedStage: null,
            errorSummary: null,
            counts: { total: 3, valid: 2, duplicate: 1 },
          },
        }),
      ),
      http.get("/api/admin/patient-imports/imp-2/rows", () => HttpResponse.json({ items: [] })),
    );
    withSession(<PatientImportsAdmin />);
    fireEvent.change(screen.getByLabelText(/ID del lote/), { target: { value: "imp-2" } });

    expect(await screen.findByText(/Procesado — revisa y aplica/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aplicar filas válidas" })).toBeInTheDocument();
  });

  it("permite reintentar un lote fallido durante procesamiento", async () => {
    let retried = false;
    server.use(
      hospitalsHandler,
      http.get("/api/admin/patient-imports/imp-failed", () =>
        HttpResponse.json({
          import: {
            id: "imp-failed",
            status: "failed",
            failedStage: "process",
            errorSummary: "La base temporal no respondió.",
            counts: { total: 49 },
          },
        }),
      ),
      http.get("/api/admin/patient-imports/imp-failed/rows", () =>
        HttpResponse.json({ items: [] }),
      ),
      http.post("/api/admin/patient-imports/imp-failed/retry", () => {
        retried = true;
        return HttpResponse.json({ jobId: "retry-1" }, { status: 202 });
      }),
    );
    withSession(<PatientImportsAdmin />);
    fireEvent.change(screen.getByLabelText(/ID del lote/), {
      target: { value: "imp-failed" },
    });

    const button = await screen.findByRole("button", {
      name: "Reintentar procesamiento",
    });
    fireEvent.click(button);
    await waitFor(() => expect(retried).toBe(true));
  });
});

describe("ImportRowsTable", () => {
  it("muestra estados, errores y candidatos de dedupe por fila", async () => {
    server.use(
      http.get("/api/admin/patient-imports/imp-3/rows", () =>
        HttpResponse.json({
          items: [
            {
              id: "r1",
              rowIndex: 0,
              name: "Demo Válida",
              age: 30,
              sourceHospital: "Hosp Demo",
              hospitalId: "h1",
              rowStatus: "valid",
              dedupStatus: "unique",
              validationErrors: [],
              validationWarnings: [],
              dedupCandidates: [],
              patientId: null,
            },
            {
              id: "r2",
              rowIndex: 1,
              name: "Demo Duplicada",
              age: 41,
              sourceHospital: "Hosp Demo",
              hospitalId: "h1",
              rowStatus: "duplicate",
              dedupStatus: "duplicate",
              validationErrors: [],
              validationWarnings: [],
              dedupCandidates: [
                { patientId: "p9", name: "Demo Original", reason: "document_hash exacto" },
              ],
              patientId: null,
            },
            {
              id: "r3",
              rowIndex: 2,
              name: null,
              age: null,
              sourceHospital: "Hospital Inexistente",
              hospitalId: null,
              rowStatus: "invalid",
              dedupStatus: "unknown",
              validationErrors: ["Falta el nombre."],
              validationWarnings: [],
              dedupCandidates: [],
              patientId: null,
            },
          ],
        }),
      ),
    );
    withSession(<ImportRowsTable importId="imp-3" />);

    expect(await screen.findByText("Demo Válida")).toBeInTheDocument();
    expect(screen.getByText("Válida")).toBeInTheDocument();
    expect(screen.getByText("Duplicada")).toBeInTheDocument();
    expect(screen.getByText(/Demo Original/)).toBeInTheDocument();
    expect(screen.getByText("Falta el nombre.")).toBeInTheDocument();
    expect(screen.getByText("Inválida")).toBeInTheDocument();
  });
});
