/**
 * ============================================================================
 * Integridad del journal de migraciones. NO toca la base: solo ficheros.
 * ============================================================================
 *
 * POR QUE EXISTE: dos ramas que generan una migracion en paralelo producen DOS
 * ficheros `0003_*.sql` y DOS entradas con `idx: 3` en `_journal.json`. Al
 * mergear, git resuelve el JSON como texto y se queda tan ancho: el journal
 * queda con indices repetidos y nadie se entera hasta que una migracion no se
 * aplica en produccion.
 *
 * Paso de verdad el 2026-08-11: `main` llevaba `0003_volunteers_contact_branch`
 * y la rama `feat/family-search-identity` llevaba su propio
 * `0003_special_piledriver` (+ un `0004` cada una).
 *
 * EL FALLO SILENCIOSO QUE MAS IMPORTA es el `when` duplicado. Drizzle no
 * registra las migraciones aplicadas por nombre ni por indice: guarda el `when`
 * del journal en `drizzle.__drizzle_migrations.created_at`. Si dos entradas
 * comparten `when`, aplicar una marca la otra como aplicada tambien — y esa
 * segunda migracion NO SE EJECUTA NUNCA, sin un solo error. Es exactamente la
 * deriva de esquema que tumbo el registro de voluntarios, pero indetectable
 * incluso mirando la tabla de migraciones.
 *
 * Corre en CI sin secretos ni base, asi que gatea CADA PR.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR || join(HERE, "../../infra/db/migrations");

interface Entry {
  idx: number;
  when: number;
  tag: string;
}

const problems: string[] = [];

function dupes<T>(values: T[]): T[] {
  const seen = new Set<T>();
  const dup = new Set<T>();
  for (const v of values) (seen.has(v) ? dup : seen).add(v);
  return [...dup];
}

const journalPath = join(MIGRATIONS_DIR, "meta/_journal.json");
const journal = JSON.parse(readFileSync(journalPath, "utf8")) as { entries: Entry[] };
const entries = journal.entries ?? [];

// 1. Indices unicos y consecutivos desde 0.
const dupIdx = dupes(entries.map((e) => e.idx));
if (dupIdx.length) {
  problems.push(
    `indices repetidos en el journal: ${dupIdx.join(", ")}. Casi siempre es un merge de dos ramas ` +
      `que generaron migracion a la vez; hay que renumerar la mas nueva.`,
  );
}
entries.forEach((e, i) => {
  if (e.idx !== i) problems.push(`entrada ${i} declara idx ${e.idx}: el journal debe ir 0,1,2,...`);
});

// 2. Tags unicos.
const dupTag = dupes(entries.map((e) => e.tag));
if (dupTag.length) problems.push(`tags repetidos: ${dupTag.join(", ")}`);

// 3. `when` unicos — el fallo silencioso descrito arriba.
const dupWhen = dupes(entries.map((e) => e.when));
if (dupWhen.length) {
  problems.push(
    `timestamps \`when\` repetidos: ${dupWhen.join(", ")}. Drizzle identifica las migraciones ` +
      `aplicadas por este valor: aplicar una marcaria la otra como aplicada y esa NO correria nunca.`,
  );
}

// 3b. `when` ESTRICTAMENTE CRECIENTE con el indice. Este es el mismo fallo
// silencioso por otra puerta, y mordio de verdad el 2026-08-11.
//
// El migrador de drizzle no lleva la cuenta por nombre ni por indice: aplica lo
// que tenga `when` MAYOR que el ultimo aplicado. `0004_volunteers_source` se
// commiteo a mano con `when: 1786554000000` — un timestamp del DIA SIGUIENTE.
// A partir de ahi, toda migracion generada con la hora real (menor que ese
// futuro) quedaba POR DEBAJO del ultimo aplicado y el migrador la SALTABA sin
// decir nada: `[migrate] listo. Esquema al dia.` y cero sentencias ejecutadas.
// Se detecto porque 0005 y 0006 no se aplicaron en staging pese a estar en el
// journal y no estar en la base.
let prevWhen = -Infinity;
for (const e of entries) {
  if (e.when <= prevWhen) {
    problems.push(
      `${e.tag} tiene when=${e.when}, que no es mayor que el de la migracion anterior ` +
        `(${prevWhen}). El migrador SALTA en silencio todo lo que quede por debajo del ` +
        `ultimo \`when\` aplicado. Sube el \`when\` de esta entrada por encima de ${prevWhen}.`,
    );
  }
  prevWhen = Math.max(prevWhen, e.when);
}

// 4. El journal y los .sql del disco dicen lo mismo.
const onDisk = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => f.replace(/\.sql$/, ""))
  .sort();
const inJournal = entries.map((e) => e.tag).sort();

for (const tag of inJournal) {
  if (!onDisk.includes(tag)) problems.push(`el journal cita ${tag}.sql pero el fichero no existe`);
}
for (const tag of onDisk) {
  if (!inJournal.includes(tag)) {
    problems.push(
      `${tag}.sql existe pero NO esta en el journal: no se aplicara nunca (¿merge a medias?)`,
    );
  }
}

// 5. Cada migracion trae su snapshot, y el ULTIMO describe el schema.ts actual.
//
// drizzle-kit NO lee la base para generar una migracion: diffea `schema.ts`
// contra el ultimo snapshot. Un snapshot que falta o que miente hace que la
// siguiente migracion generada incluya cambios YA aplicados, y aplicarla revienta
// contra produccion.
//
// Paso de verdad: `a81e17c` commiteo un 0003_snapshot.json que seguia diciendo
// `phone` (sin su propio rename a `contact`), y `8fdf13f` no commiteo snapshot
// ninguno. El repo quedo a un `db:generate` de generar una migracion que
// re-renombraba una columna que ya no existia.
const metaDir = join(MIGRATIONS_DIR, "meta");
const snapshots = readdirSync(metaDir).filter((f) => /^\d+_snapshot\.json$/.test(f));
for (const e of entries) {
  const expected = `${String(e.idx).padStart(4, "0")}_snapshot.json`;
  if (!snapshots.includes(expected)) {
    problems.push(
      `falta meta/${expected} (migracion ${e.tag}). Sin el, el siguiente ` +
        `\`db:generate\` diffea contra un estado viejo y genera cambios ya aplicados.`,
    );
  }
}

if (problems.length) {
  console.error("");
  console.error("=".repeat(72));
  console.error("JOURNAL DE MIGRACIONES INCONSISTENTE");
  console.error("=".repeat(72));
  for (const p of problems) console.error(`  - ${p}`);
  console.error("");
  console.error("  Arreglo habitual tras un merge: borra tu .sql y su entrada, vuelve a correr");
  console.error("  `npm run db:generate` sobre el schema ya mergeado y commitea lo regenerado.");
  console.error("");
  process.exit(1);
}

console.log(`[journal] OK: ${entries.length} migraciones, indices/tags/timestamps consistentes.`);
