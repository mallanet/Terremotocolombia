// Tests del contador de "ayuda psicológica": el POST distingue dos caminos —
// clic anónimo (dedup por hash de IP) y envío de formulario (source:"form" +
// token con secreto compartido, SIN dedup: cada envío real cuenta).
//
// Mismo patrón que volunteers.test.ts: app Express en memoria (supertest) +
// doble de `@/db` en el límite (insert/execute/select mínimos para el CTE y
// el UPDATE...RETURNING del service).
import "./helpers";

process.env.PSYCH_FORM_SUBMIT_SECRET = "test-form-submit-secret-0123456789abcdef";

import express from "express";
import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  count: 0,
  dedupIps: new Set<string>(),
}));

vi.mock("@/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/db")>();

  const fakeDb = {
    insert: () => ({
      values: () => ({
        onConflictDoNothing: () => Promise.resolve(),
      }),
    }),
    // El service usa db.execute(sql`...`) tanto para el CTE de dedup+incremento
    // (clic anónimo) como para el UPDATE...RETURNING (envío de formulario).
    // El doble no distingue SQL: simula "incrementa y devuelve el total".
    execute: () => {
      dbMocks.count += 1;
      return Promise.resolve([{ count: dbMocks.count }]);
    },
    select: () => ({
      from: () => ({
        where: () => Promise.resolve([{ count: dbMocks.count }]),
      }),
    }),
  };

  return { ...actual, getDb: () => fakeDb };
});

let app: express.Express;

beforeAll(async () => {
  const { psychologyHelpRouter } = await import("@/routes/psychology-help");
  const { errorHandler } = await import("@/middleware");
  app = express();
  app.use(express.json());
  app.use("/api/stats/psychology-help", psychologyHelpRouter);
  app.use(errorHandler);
});

beforeEach(() => {
  dbMocks.count = 0;
});

describe("POST /api/stats/psychology-help", () => {
  it("clic anónimo: 200 y devuelve el total (camino dedup por hash de IP)", async () => {
    const response = await request(app)
      .post("/api/stats/psychology-help")
      .set("cf-connecting-ip", "203.0.113.42") // TEST-NET-3 (RFC 5737)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(1);
  });

  it("source:form con token válido incrementa SIN dedup (cada envío cuenta)", async () => {
    const token = "test-form-submit-secret-0123456789abcdef";
    const first = await request(app)
      .post("/api/stats/psychology-help")
      .send({ source: "form", token });
    const second = await request(app)
      .post("/api/stats/psychology-help")
      .send({ source: "form", token });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.count).toBe(2);
  });

  it("acepta el token DERIVADO del JWT_SECRET (cero configuración extra)", async () => {
    const { createHmac } = await import("crypto");
    const derived = createHmac("sha256", process.env.JWT_SECRET!)
      .update("psych-form-submit:v1")
      .digest("hex");

    const response = await request(app)
      .post("/api/stats/psychology-help")
      .send({ source: "form", token: derived });

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(1);
  });

  it("source:form con token inválido → 403 y no incrementa", async () => {
    const response = await request(app)
      .post("/api/stats/psychology-help")
      .send({ source: "form", token: "token-equivocado" });

    expect(response.status).toBe(403);
    expect(dbMocks.count).toBe(0);
  });

  it("source:form sin token → 403 y no incrementa", async () => {
    const response = await request(app)
      .post("/api/stats/psychology-help")
      .send({ source: "form" });

    expect(response.status).toBe(403);
    expect(dbMocks.count).toBe(0);
  });
});
