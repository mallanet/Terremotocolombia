/**
 * Lo delicado de src/lib/db-error.ts NO es que loguee, es QUE DEJA FUERA.
 *
 * Postgres mete los valores de la fila en `detail`/`where`/`hint`: un
 * unique_violation trae 'Key (contact)=(+57 300 ...) already exists.' y un
 * check_violation trae 'Failing row contains (uuid, Maria ..., +57 ...)'. Esta
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
        detail: "Key (contact)=(+57 300 000 0000) already exists.",
        where: "PL/pgSQL function persist(text) line 4 at SQL statement",
        hint: "Revisa el registro de Maria Gomez.",
      }),
    );
    // Lo util si esta.
    expect(out).toContain("sqlstate=23505");
    expect(out).toContain("constraint=volunteers_pkey");
    // Lo que jamas puede aparecer.
    expect(out).not.toContain("+57 300 000 0000");
    expect(out).not.toContain("Maria Gomez");
    expect(out).not.toContain("PL/pgSQL");
    expect(out).not.toMatch(/detail|where|hint/i);
  });

  it("aguanta un throw que no es Error sin reventar el handler", () => {
    expect(describeDbError("string suelto")).toBe("non-error thrown (string)");
    expect(describeDbError(undefined)).toBe("non-error thrown (undefined)");
  });
});
