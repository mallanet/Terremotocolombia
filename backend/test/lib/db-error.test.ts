/**
 * Lo delicado de src/lib/db-error.ts NO es que loguee, es QUE DEJA FUERA.
 *
 * Postgres mete los valores de la fila en `detail`/`where`/`hint`: un
 * unique_violation trae 'Key (contact)=(<telefono real>) already exists.' y un
 * check_violation trae 'Failing row contains (uuid, <nombre real>, ...)'. Esta
 * base guarda voluntarios y personas desaparecidas REALES, asi que esos campos
 * en un log de Cloudflare son una fuga de PII.
 *
 * Si alguien "mejora" el helper pasando el error entero a console.error, o
 * suma `detail` para depurar mas comodo, estos tests tienen que ponerse en
 * rojo.
 */
import { describe, expect, it } from "vitest";
import { describeDbError } from "@/lib/db-error";

/** Error tal como lo entrega node-postgres / NeonDbError. */
function pgError(fields: Record<string, string>): Error {
  const err = new Error(fields.message ?? "boom");
  return Object.assign(err, fields);
}

describe("describeDbError", () => {
  it("expone el SQLSTATE — es lo que diagnostica el fallo de un vistazo", () => {
    // El fallo real del 2026-08-11: migracion 0003 sin aplicar.
    const out = describeDbError(
      pgError({
        name: "NeonDbError",
        code: "42703",
        message: 'column "contact" of relation "volunteers" does not exist',
      }),
    );
    expect(out).toContain("sqlstate=42703");
    expect(out).toContain("does not exist");
  });

  it("NUNCA filtra detail/where/hint — ahi viajan los datos de la persona", () => {
    const out = describeDbError(
      pgError({
        name: "NeonDbError",
        code: "23505",
        message: 'duplicate key value violates unique constraint "volunteers_pkey"',
        constraint: "volunteers_pkey",
        table: "volunteers",
        detail: "Key (contact)=(CONTACTO-PLACEHOLDER) already exists.",
        where: "PL/pgSQL function persist(text) line 4 at SQL statement",
        hint: "Revisa el registro de NOMBRE-PLACEHOLDER.",
      }),
    );
    // Lo util si esta.
    expect(out).toContain("sqlstate=23505");
    expect(out).toContain("constraint=volunteers_pkey");
    // Lo que jamas puede aparecer.
    expect(out).not.toContain("CONTACTO-PLACEHOLDER");
    expect(out).not.toContain("NOMBRE-PLACEHOLDER");
    expect(out).not.toContain("PL/pgSQL");
    expect(out).not.toMatch(/detail|where|hint/i);
  });

  it("corta los params ligados que Drizzle mete en el message (fuga real de prod)", () => {
    // Forma EXACTA de un DrizzleQueryError observado en produccion el
    // 2026-08-11. La primera version de este modulo lo dejo pasar entero y
    // publico nombre, telefono y ciudad de un voluntario en los logs.
    // Los valores de aqui son inventados, pero la ESTRUCTURA es la real.
    const drizzleErr = new Error(
      'Failed query: insert into "volunteers" ("id", "name", "contact", "zone") ' +
        "values ($1, $2, $3, $4)\n" +
        "params: 11111111-2222-3333-4444-555555555555,NOMBRE-PLACEHOLDER,CONTACTO-PLACEHOLDER,CIUDAD-PLACEHOLDER",
    );
    // Drizzle deja el error del driver (con SQLSTATE) en `cause`.
    Object.assign(drizzleErr, {
      cause: pgError({
        name: "NeonDbError",
        code: "42703",
        message: 'column "source" of relation "volunteers" does not exist',
      }),
    });

    const out = describeDbError(drizzleErr);

    // Se conserva lo que diagnostica.
    expect(out).toContain("sqlstate=42703");
    // Y NADA de la fila.
    expect(out).not.toContain("NOMBRE-PLACEHOLDER");
    expect(out).not.toContain("CONTACTO-PLACEHOLDER");
    expect(out).not.toContain("CIUDAD-PLACEHOLDER");
    expect(out).not.toMatch(/params:/i);
  });

  it("si el message trae params pero no hay cause, igual los corta", () => {
    const out = describeDbError(
      new Error('Failed query: insert into "x" values ($1)\nparams: NOMBRE-PLACEHOLDER'),
    );
    expect(out).not.toContain("NOMBRE-PLACEHOLDER");
    expect(out).toContain("[params omitidos]");
  });

  it("aguanta un throw que no es Error sin reventar el handler", () => {
    expect(describeDbError("string suelto")).toBe("non-error thrown (string)");
    expect(describeDbError(undefined)).toBe("non-error thrown (undefined)");
  });
});
