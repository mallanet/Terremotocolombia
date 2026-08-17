/**
 * Un guardia que autoriza tiene que llamar a next() cuando la cosa sale BIEN.
 *
 * Suena obvio, y sin embargo dos guardias de este repo se escribieron con
 * asyncHandler, que solo propaga el error: al rechazar respondían 401 al
 * instante, y al aceptar dejaban la petición colgada hasta el timeout del
 * cliente. El camino roto era el feliz, que es el que nadie prueba a mano.
 *
 * La prueba es estática (lee el fichero) porque importar un guardia arrastra
 * la conexión a la base y la validación de entorno. El fallo estaba en la
 * forma del middleware, y la forma es justo lo que se puede leer sin entorno.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const GUARDS = ["src/middleware/supply-auth.ts", "src/middleware/campaign-steward.ts"];

function sourceOf(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("guardias de autorización", () => {
  it.each(GUARDS)("%s no define el guardia con asyncHandler", (path) => {
    const source = sourceOf(path);
    expect(source).not.toMatch(/export const require\w+\s*:\s*RequestHandler\s*=\s*asyncHandler/);
  });

  it.each(GUARDS)("%s continúa la cadena con next()", (path) => {
    expect(sourceOf(path)).toMatch(/next\(\)/);
  });
});
