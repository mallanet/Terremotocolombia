// Tests de POST /api/public/volunteers/:id/message — la acción "Contactar"
// del panel: 404 si no existe, 400 si el contacto no es correo, 503 si el
// mailer no puede enviar, 200 + markContacted + auditoría cuando envía.
//
// El GATE (requireCapability volunteer:edit) NO se ejercita aquí — lo cubre
// authz-matrix.test.ts contra la app real; aquí se mockea para probar solo la
// lógica del handler. `@/db` se mockea en el límite (patrón volunteers.test).
import "./helpers";
import express from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  sendMail: vi.fn(),
  updated: [] as Array<unknown>,
}));

vi.mock("@/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/db")>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- doble mínimo de la cadena fluida de Drizzle, solo para tests
  const c: any = {
    from: () => c,
    where: () => c,
    orderBy: () => c,
    limit: () => c,
    then: (resolve: (v: unknown[]) => void) => resolve(dbMocks.rows),
  };

  return {
    ...actual,
    getDb: () => ({
      select: () => c,
      insert: () => ({ values: () => Promise.resolve() }),
      update: () => ({
        set: (v: unknown) => ({
          where: () => {
            dbMocks.updated.push(v);
            return Promise.resolve();
          },
        }),
      }),
    }),
  };
});

// El gate real (JWT + volunteer:edit) lo cubre la matriz; aquí pasa siempre.
vi.mock("@/middleware/auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/middleware/auth")>();
  return {
    ...actual,
    requireCapability: () => (
      _req: express.Request,
      _res: express.Response,
      next: express.NextFunction,
    ) => next(),
  };
});

vi.mock("@/auth/mailer", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/auth/mailer")>();
  return { ...actual, sendVolunteerMessage: dbMocks.sendMail };
});

const VOLUNTEER_ROW = {
  id: "vol-1",
  name: "DEMO-Voluntaria",
  contact: "demo@example.org",
  offer: "",
  zone: "DEMO-Bogotá",
  availability: "DEMO-fines de semana",
  offerTypes: ["persona"],
  digitalSkills: null,
  crisisExperience: null,
  fieldCity: null,
  rescueTraining: null,
  fieldRole: null,
  ownVehicle: null,
  source: "directo",
  status: "pending",
  notes: null,
  createdAt: Date.now(),
  updatedAt: null,
};

let app: express.Express;

beforeAll(async () => {
  const { volunteersActionsRouter } = await import(
    "@/public-api/routers/volunteers-actions.router"
  );
  const { errorHandler } = await import("@/middleware");
  app = express();
  app.use(express.json());
  app.use("/api/public/volunteers", volunteersActionsRouter);
  app.use(errorHandler);
});

beforeEach(() => {
  dbMocks.rows = [{ ...VOLUNTEER_ROW }];
  dbMocks.updated.length = 0;
  dbMocks.sendMail.mockReset();
});

describe("POST /api/public/volunteers/:id/message", () => {
  it("404 si el voluntario no existe", async () => {
    dbMocks.rows = [];
    const response = await request(app)
      .post("/api/public/volunteers/none/message")
      .send({ subject: "Hola", message: "Mensaje" });

    expect(response.status).toBe(404);
    expect(dbMocks.sendMail).not.toHaveBeenCalled();
  });

  it("400 si el contacto no es un correo (p.ej. WhatsApp) y no envía nada", async () => {
    dbMocks.rows = [{ ...VOLUNTEER_ROW, contact: "+57 300 000 0000" }];
    const response = await request(app)
      .post("/api/public/volunteers/vol-1/message")
      .send({ subject: "Hola", message: "Mensaje" });

    expect(response.status).toBe(400);
    expect(dbMocks.sendMail).not.toHaveBeenCalled();
  });

  it("503 si el mailer no puede enviar (SMTP ausente) y NO marca contacted", async () => {
    dbMocks.sendMail.mockResolvedValue({ sent: false });
    const response = await request(app)
      .post("/api/public/volunteers/vol-1/message")
      .send({ subject: "Hola", message: "Mensaje" });

    expect(response.status).toBe(503);
    expect(dbMocks.updated).toHaveLength(0);
  });

  it("200 al enviar: llama al mailer con (contacto, asunto, mensaje) y marca contacted", async () => {
    dbMocks.sendMail.mockResolvedValue({ sent: true });
    const response = await request(app)
      .post("/api/public/volunteers/vol-1/message")
      .send({ subject: "Bienvenida", message: "Gracias por sumarte." });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ ok: true, sentTo: "demo@example.org" });
    expect(dbMocks.sendMail).toHaveBeenCalledWith(
      "demo@example.org",
      "Bienvenida",
      "Gracias por sumarte.",
    );
    expect(dbMocks.updated[0]).toMatchObject({ status: "contacted" });
  });

  it("400 si falta el asunto o el mensaje (validación zod)", async () => {
    const response = await request(app)
      .post("/api/public/volunteers/vol-1/message")
      .send({ subject: "", message: "" });

    expect(response.status).toBe(400);
    expect(dbMocks.sendMail).not.toHaveBeenCalled();
  });
});
