/**
 * Regresión: validate() bajo Express 5.
 *
 * En Express 5 `req.query` es un getter perezoso que re-parsea la URL en CADA
 * acceso y devuelve un objeto nuevo. La implementación previa de validate()
 * hacía `Object.assign(req.query, parsed)` sobre ese objeto temporal: los
 * .default()/.coerce de zod se perdían antes del handler. Síntoma real:
 * GET /api/patients/search sin ?limit → `LIMIT NaN` → 500 (2026-08-11).
 *
 * Estos tests montan apps Express de juguete con el validate() REAL (mismo
 * express de node_modules, mismo getter perezoso) y fijan el contrato:
 * lo que el handler lee en req.query/req.params es EXACTAMENTE la salida
 * parseada por zod. No tocan DB ni Valkey.
 */
// Env mínimo ANTES de importar el middleware (config/env valida al cargar y
// exige DATABASE_URL; aquí nadie abre conexiones).
process.env.DATABASE_URL ??= "postgres://mapa_app:localdev@localhost:5432/app";

import express from "express";
import request from "supertest";
import { z } from "zod";
import { describe, expect, it } from "vitest";

const { validate, errorHandler } = await import("@/middleware");

// Mismo esquema que /api/patients/search: el caso del incidente.
const searchQuery = z.object({
  q: z.string().default(""),
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

function makeQueryApp() {
  const app = express();
  app.get("/search", validate({ query: searchQuery }), (req, res) => {
    const first = req.query as unknown as z.infer<typeof searchQuery>;
    // Segunda lectura: bajo el getter perezoso cada acceso devolvía un objeto
    // NUEVO re-parseado de la URL; tras el fix ambas lecturas ven lo mismo.
    const second = req.query as unknown as z.infer<typeof searchQuery>;
    res.json({
      q: first.q,
      limit: first.limit,
      limitType: typeof first.limit,
      stableAcrossReads: first === second && second.limit === first.limit,
      keys: Object.keys(req.query),
    });
  });
  app.use(errorHandler);
  return app;
}

describe("validate({ query }) bajo Express 5", () => {
  it("los .default() de zod llegan al handler sin params (el 500 de patients/search)", async () => {
    const res = await request(makeQueryApp()).get("/search");
    expect(res.status).toBe(200);
    expect(res.body.q).toBe("");
    expect(res.body.limit).toBe(50);
    // La raíz del incidente: limit llegaba undefined → Number(undefined) → NaN.
    expect(res.body.limitType).toBe("number");
  });

  it("los .coerce de zod llegan tipados (número, no el string crudo de la URL)", async () => {
    const res = await request(makeQueryApp()).get("/search?limit=200&q=ana");
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(200);
    expect(res.body.limitType).toBe("number");
    expect(res.body.q).toBe("ana");
  });

  it("req.query es estable entre lecturas repetidas dentro del handler", async () => {
    const res = await request(makeQueryApp()).get("/search?limit=7");
    expect(res.body.stableAcrossReads).toBe(true);
  });

  it("las claves fuera del esquema no llegan al handler (zod las descarta)", async () => {
    const res = await request(makeQueryApp()).get("/search?limit=7&evil=1");
    expect(res.status).toBe(200);
    expect(res.body.keys.sort()).toEqual(["limit", "q"]);
  });

  it("un valor inválido sigue devolviendo 400, no 500", async () => {
    const res = await request(makeQueryApp()).get("/search?limit=9999");
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTruthy();
  });
});

describe("validate({ params }) bajo Express 5", () => {
  it("coerciones/validaciones llegan al handler y las claves de ruta fuera del esquema sobreviven", async () => {
    const app = express();
    app.get(
      "/lots/:page/rows/:rowId",
      // Esquema PARCIAL a propósito: valida page pero no rowId. El merge de
      // validate() no debe borrar rowId del req.params del handler.
      validate({ params: z.object({ page: z.coerce.number().int().min(1) }) }),
      (req, res) => {
        const { page, rowId } = req.params as unknown as { page: number; rowId: string };
        res.json({ page, pageType: typeof page, rowId });
      },
    );
    app.use(errorHandler);

    const res = await request(app).get("/lots/3/rows/abc");
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(3);
    expect(res.body.pageType).toBe("number");
    expect(res.body.rowId).toBe("abc");
  });

  it("un param inválido devuelve 400", async () => {
    const app = express();
    app.get(
      "/lots/:page",
      validate({ params: z.object({ page: z.coerce.number().int().min(1) }) }),
      (_req, res) => {
        res.json({ ok: true });
      },
    );
    app.use(errorHandler);
    expect((await request(app).get("/lots/cero")).status).toBe(400);
  });
});

describe("validate({ body }) sigue reemplazando el body parseado", () => {
  it("aplica defaults y coerciones al body", async () => {
    const app = express();
    app.post(
      "/echo",
      express.json(),
      validate({ body: z.object({ n: z.coerce.number(), tag: z.string().default("x") }) }),
      (req, res) => {
        res.json(req.body as Record<string, unknown>);
      },
    );
    app.use(errorHandler);

    const res = await request(app).post("/echo").send({ n: "42" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ n: 42, tag: "x" });
  });
});
