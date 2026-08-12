import { HttpResponse, http } from "msw";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { server } from "@/tests/setup";
import { renderWithProviders } from "@/tests/_utils/render-with-providers";
import { ModelTable } from "@/src/contexts/models/ui/model-table";
import { getModel } from "@/src/contexts/models/model-registry";
import { AdminSessionContext } from "@/src/shared/auth/admin-session-context";

const reports = getModel("reports")!;
const volunteers = getModel("volunteers")!;

function renderWithCaps(model: typeof volunteers, capabilities: string[]) {
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
      <ModelTable model={model} />
    </AdminSessionContext.Provider>,
  );
}

describe("ModelTable — selector de hospital (select-model)", () => {
  it("el form de pacientes ofrece hospitales por nombre, no UUIDs", async () => {
    server.use(
      http.get("/api/models/patients", () => HttpResponse.json([])),
      http.get("/api/models/hospitals", () =>
        HttpResponse.json([
          { id: "h-1", name: "Hospital Demo Uno" },
          { id: "h-2", name: "Hospital Demo Dos" },
        ]),
      ),
    );
    const patients = getModel("patients")!;
    const capabilities = ["patient:read", "patient:create"];
    renderWithProviders(
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
        <ModelTable model={patients} />
      </AdminSessionContext.Provider>,
    );

    const select = await screen.findByLabelText("Hospital");
    expect(select.tagName).toBe("SELECT");
    expect(await screen.findByRole("option", { name: "Hospital Demo Uno" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Hospital Demo Dos" })).toBeInTheDocument();
  });
});

describe("ModelTable operations", () => {
  it("solo muestra acciones concedidas por capacidad", async () => {
    server.use(
      http.get("/api/models/reports", () =>
        HttpResponse.json([{ id: "report-1", place: "Lugar Demo" }]),
      ),
    );
    const capabilities = ["report:read", "report:delete"];
    renderWithProviders(
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
        <ModelTable model={reports} />
      </AdminSessionContext.Provider>,
    );

    expect(await screen.findByText("Lugar Demo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Crear" })).not.toBeInTheDocument();
  });
});

describe("ModelTable — estado y edición de voluntarios", () => {
  const row = {
    id: "v-1",
    name: "DEMO-Voluntaria",
    contact: "demo@example.org",
    zone: "DEMO-Pereira",
    status: "pending",
  };
  const caps = ["volunteer:read", "volunteer:edit"];

  it("el estado es un dropdown con las opciones rotuladas y cambiarlo hace PATCH", async () => {
    let patchBody: unknown = null;
    server.use(
      http.get("/api/models/volunteers", () => HttpResponse.json([row])),
      http.patch("/api/models/volunteers/v-1", async ({ request }) => {
        patchBody = await request.json();
        return HttpResponse.json({ ...row, status: "contacted" });
      }),
    );
    const user = userEvent.setup();
    renderWithCaps(volunteers, caps);

    const select = await screen.findByRole("combobox", { name: "Cambiar estado" });
    expect(select).toHaveValue("pending");
    expect(screen.getByRole("option", { name: "Pendiente" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Contactado" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Activo" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Declinado" })).toBeInTheDocument();

    await user.selectOptions(select, "contacted");
    expect(patchBody).toEqual({ status: "contacted" });
  });

  it("Editar abre el formulario inline bajo la fila (visible, no al pie)", async () => {
    server.use(http.get("/api/models/volunteers", () => HttpResponse.json([row])));
    const user = userEvent.setup();
    renderWithCaps(volunteers, caps);

    expect(screen.queryByRole("button", { name: "Guardar" })).not.toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Editar" }));
    expect(await screen.findByRole("button", { name: "Guardar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });
});
