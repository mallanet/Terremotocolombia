/**
 * Regresión HTTP del incidente 2026-08-11: GET /api/patients/search SIN ?limit
 * respondía 500 (`LIMIT NaN`) porque los defaults de zod aplicados en
 * validate() se perdían con el req.query perezoso de Express 5. Los tests
 * existentes siempre mandaban limit explícito y nunca lo pillaron.
 *
 * Integración real (app completa + Postgres local). El fondo del bug está
 * fijado en validate-express5-query.test.ts; aquí se fija la RUTA del incidente.
 */
import { beforeAll, describe, expect, it } from "vitest";
import "./helpers";
import request from "supertest";

let app: import("express").Express;

beforeAll(async () => {
  app = (await import("@/server")).app;
});

describe("GET /api/patients/search (regresión Express 5 lazy req.query)", () => {
  it("sin ?limit responde 200 con los defaults del esquema, no 500", async () => {
    const res = await request(app).get("/api/patients/search");
    expect(res.status).toBe(200);
    expect(res.body.query).toBe("");
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(typeof res.body.hasMore).toBe("boolean");
  });

  it("con q y sin limit responde 200 (búsqueda sintética, sin datos reales)", async () => {
    const res = await request(app)
      .get("/api/patients/search")
      .query({ q: "zz-demo-inexistente" });
    expect(res.status).toBe(200);
    expect(res.body.query).toBe("zz-demo-inexistente");
  });

  it("limit fuera de rango responde 400, no 500", async () => {
    const res = await request(app).get("/api/patients/search").query({ limit: 9999 });
    expect(res.status).toBe(400);
  });
});
