import { HttpResponse, http } from "msw";
import { screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { server } from "@/tests/setup";
import { ClusterFicha } from "@/src/contexts/family-search/cluster-ficha";
import { withSession } from "./test-utils";

const baseFicha = {
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
    {
      prn: "TC-DEMO0002Y",
      recordType: "hospital_patient",
      name: "Demo Dos",
      age: 31,
      population: "hospital_patient",
      source: "Hospital Demo",
      outcome: null,
      clusterId: "cluster-1",
      addedAt: 1000,
      removedAt: null,
      addedBy: "u1",
    },
  ],
  decisions: [
    {
      id: "dec-1",
      linkId: "link-1",
      prnA: "TC-DEMO0001X",
      prnB: "TC-DEMO0002Y",
      decision: "confirmed",
      note: "",
      evidenceSnapshot: { evidenceClass: "name_age_exact" },
      decidedBy: "u1",
      decidedAt: 900,
    },
  ],
};

describe("ClusterFicha", () => {
  it("renderiza miembros lado a lado y la historia de decisiones", async () => {
    server.use(
      http.get("/api/admin/family-search/clusters/cluster-1", () =>
        HttpResponse.json({ item: baseFicha }),
      ),
    );
    withSession(<ClusterFicha target={{ type: "cluster", clusterId: "cluster-1" }} onJumpToQueue={() => {}} />);

    expect(await screen.findByText("Demo Uno")).toBeInTheDocument();
    expect(screen.getByText("Demo Dos")).toBeInTheDocument();
    expect(screen.getByText("TC-DEMO0001X")).toBeInTheDocument();
    expect(screen.getByText("TC-DEMO0002Y")).toBeInTheDocument();
    expect(screen.getByText("Confirmado")).toBeInTheDocument();
  });

  it("adjuntar un registro por búsqueda manual muestra la confirmación con el enlace a la cola", async () => {
    server.use(
      http.get("/api/admin/family-search/clusters/cluster-1", () =>
        HttpResponse.json({ item: baseFicha }),
      ),
      http.get("/api/admin/family-search/records/search", () =>
        HttpResponse.json({
          exactPrnMatch: null,
          results: [
            {
              prn: "TC-DEMO0003Z",
              recordType: "unidentified_person",
              name: "Demo Tres",
              age: null,
              population: "unidentified_person",
              source: "",
              outcome: null,
              clusterId: null,
            },
          ],
        }),
      ),
      http.post("/api/admin/family-search/propose", () =>
        HttpResponse.json({
          item: {
            id: "link-new",
            prnA: "TC-DEMO0001X",
            prnB: "TC-DEMO0003Z",
            status: "proposed",
            score: null,
            evidence: {},
            evidenceClass: "manual",
            method: "manual",
            matcherVersion: null,
            proposedAt: 2000,
          },
          created: true,
        }),
      ),
    );
    withSession(<ClusterFicha target={{ type: "cluster", clusterId: "cluster-1" }} onJumpToQueue={() => {}} />);
    await screen.findByText("Demo Uno");

    fireEvent.change(screen.getByLabelText("Buscar por nombre o PRN"), {
      target: { value: "Demo Tres" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

    fireEvent.click(await screen.findByRole("button", { name: "Adjuntar" }));

    expect(
      await screen.findByText(/Propuesta creada — pendiente en la cola de revisión\./),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ir a la cola" })).toBeInTheDocument();
  });

  it("una ficha standalone (sin cluster todavía) permite proponer el primer vínculo", async () => {
    withSession(
      <ClusterFicha
        target={{
          type: "standalone",
          record: {
            prn: "TC-DEMO0004W",
            recordType: "missing_report",
            name: "Demo Aislado",
            age: 40,
            population: "missing_report",
            source: "",
            outcome: null,
            clusterId: null,
          },
        }}
        onJumpToQueue={() => {}}
      />,
    );

    expect(await screen.findByText("Registro sin cluster")).toBeInTheDocument();
    expect(screen.getByText("Demo Aislado")).toBeInTheDocument();
    expect(screen.getByText("Vincular otro registro manualmente")).toBeInTheDocument();
  });
});
