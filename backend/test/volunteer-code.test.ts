// Tests del código único de voluntario: generación en el registro, endpoint
// de verificación, check-in con evidencia y atribución de reportes.
// `@/db` mockeado por TABLA (mismo harness que voluntariado.test.ts): el
// `from(table)` decide qué filas devuelve; el where se ignora (filtrado lo
// simula el test sembrando o vaciando las filas).
import "./helpers";
import express from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  volunteers: [] as Array<Record<string, unknown>>,
  checkins: [] as Array<Record<string, unknown>>,
  reports: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/db")>();

  function rowsFor(table: unknown): Array<Record<string, unknown>> {
    if (table === actual.schema.volunteers) return dbMocks.volunteers;
    if (table === actual.schema.volunteerCheckins) return dbMocks.checkins;
    if (table === actual.schema.reports) return dbMocks.reports;
    return [];
  }

  function chain() {
    let rows: Array<Record<string, unknown>> = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- doble mínimo de la cadena fluida de Drizzle, solo para tests
    const c: any = {
      from: (table: unknown) => {
        rows = rowsFor(table);
        return c;
      },
      innerJoin: () => c,
      where: () => c,
      orderBy: () => c,
      limit: () => c,
      then: (resolve: (v: Array<Record<string, unknown>>) => void) => resolve(rows),
    };
    return c;
  }

  return {
    ...actual,
    getDb: () => ({
      select: () => chain(),
      insert: (table: unknown) => ({
        values: (row: Record<string, unknown>) => {
          rowsFor(table).push(row);
          return Promise.resolve();
        },
      }),
    }),
  };
});

const VOLUNTEER = { id: "vol-1", name: "DEMO-Voluntaria", code: "483920" };

let app: express.Express;

beforeAll(async () => {
  const { voluntariadoRouter } = await import("@/routes/voluntariado");
  const { reportsRouter } = await import("@/routes/reports");
  const { errorHandler } = await import("@/middleware");
  app = express();
  app.use(express.json());
  app.use("/api/voluntariado", voluntariadoRouter);
  app.use("/api/reports", reportsRouter);
  app.use(errorHandler);
});

beforeEach(() => {
  dbMocks.volunteers = [{ ...VOLUNTEER }];
  dbMocks.checkins = [];
  dbMocks.reports = [];
});

describe("código único en el registro (service)", () => {
  it("createVolunteer genera un código de 6 dígitos y lo persiste", async () => {
    dbMocks.volunteers = [];
    const { createVolunteer } = await import("@/services/volunteers");

    const created = await createVolunteer({
      name: "DEMO-Nuevo",
      contact: "DEMO-300",
      offer: "",
      zone: "DEMO-Pereira",
      availability: "DEMO-fines de semana",
      offerTypes: ["persona"],
    });

    expect(created.code).toMatch(/^\d{6}$/);
    expect(dbMocks.volunteers[0]?.code).toBe(created.code);
  });
});

describe("POST /api/voluntariado/verificar-codigo", () => {
  it("código conocido → 200 con el nombre del voluntario", async () => {
    const response = await request(app)
      .post("/api/voluntariado/verificar-codigo")
      .send({ code: "483920" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, name: "DEMO-Voluntaria" });
  });

  it("acepta el código con espacios (se normaliza)", async () => {
    const response = await request(app)
      .post("/api/voluntariado/verificar-codigo")
      .send({ code: "483 920" });

    expect(response.status).toBe(200);
  });

  it("código desconocido → 404", async () => {
    dbMocks.volunteers = [];
    const response = await request(app)
      .post("/api/voluntariado/verificar-codigo")
      .send({ code: "000000" });

    expect(response.status).toBe(404);
  });

  it("código malformado → 400 de validación sin tocar la base", async () => {
    const response = await request(app)
      .post("/api/voluntariado/verificar-codigo")
      .send({ code: "12" });

    expect(response.status).toBe(400);
  });
});

describe("POST /api/voluntariado/checkin", () => {
  it("código válido → 201 y persiste lugar + nota ligados al voluntario", async () => {
    const response = await request(app)
      .post("/api/voluntariado/checkin")
      .send({
        code: "483920",
        place: "DEMO-Centro de acopio La Villa",
        note: "DEMO-Dejé la caja 12 en el estante B",
      });

    expect(response.status).toBe(201);
    expect(dbMocks.checkins).toHaveLength(1);
    expect(dbMocks.checkins[0]).toMatchObject({
      volunteerId: "vol-1",
      place: "DEMO-Centro de acopio La Villa",
      note: "DEMO-Dejé la caja 12 en el estante B",
    });
  });

  it("código inválido → 400 y no persiste nada", async () => {
    dbMocks.volunteers = [];
    const response = await request(app)
      .post("/api/voluntariado/checkin")
      .send({ code: "000000", place: "DEMO-Acopio" });

    expect(response.status).toBe(400);
    expect(dbMocks.checkins).toHaveLength(0);
  });

  it("sin lugar → 400 de validación", async () => {
    const response = await request(app)
      .post("/api/voluntariado/checkin")
      .send({ code: "483920", place: "" });

    expect(response.status).toBe(400);
    expect(dbMocks.checkins).toHaveLength(0);
  });
});

describe("POST /api/reports con volunteerCode (atribución)", () => {
  const reportBody = {
    type: "critical",
    lat: 4.8133,
    lng: -75.6961,
    place: "DEMO-Barrio Centro",
  };

  it("código válido → el reporte queda ligado al voluntario", async () => {
    const response = await request(app)
      .post("/api/reports")
      .send({ ...reportBody, volunteerCode: "483920" });

    expect(response.status).toBe(201);
    expect(dbMocks.reports[0]?.volunteerId).toBe("vol-1");
  });

  it("código inválido → 400 claro y NO se guarda el reporte", async () => {
    dbMocks.volunteers = [];
    const response = await request(app)
      .post("/api/reports")
      .send({ ...reportBody, volunteerCode: "000000" });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("código de voluntario");
    expect(dbMocks.reports).toHaveLength(0);
  });

  it("sin código → reporte anónimo normal (volunteerId null)", async () => {
    const response = await request(app).post("/api/reports").send(reportBody);

    expect(response.status).toBe(201);
    expect(dbMocks.reports[0]?.volunteerId).toBeNull();
  });
});
