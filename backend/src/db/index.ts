/**
 * Acceso a la base con Drizzle ORM sobre Postgres vía node-postgres (solo TCP).
 * El esquema vive en infra/db/schema.ts (fuente de verdad, compartida con las
 * migraciones drizzle-kit).
 *
 * DATABASE_URL apunta a tu instancia de Postgres. getDb() es síncrono (crear
 * el Pool no hace I/O; la conexión real es perezosa en la primera query).
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { neon, neonConfig } from "@neondatabase/serverless";
import { Pool } from "pg";
import * as schema from "../../../infra/db/schema.js";
import { env } from "@/config/env";
import { retryingFetch } from "./retry.js";

/**
 * Tipo canonico de la base: el de node-postgres.
 *
 * Los dos drivers (node-postgres y neon-http) exponen la MISMA API de consulta
 * de Drizzle sobre el mismo `schema`; solo cambia el transporte. Se fija este
 * como tipo publico y el otro se castea, para que `getDb()` siga devolviendo un
 * tipo concreto.
 *
 * Importa: cuando esto devolvia `any`, la inferencia se caia en cascada por
 * todos los servicios que lo consumen (~10 ficheros con TS7006/TS7031
 * "implicitly has an any type"). Un `any` aqui no es local, se propaga.
 */
type Db = ReturnType<typeof drizzle<typeof schema>>;

let _db: Db | null = null;

/**
 * ¿Estamos en Cloudflare Workers?
 *
 * Importa porque el driver TIENE que cambiar, no por gusto: en Workers un
 * socket TCP pertenece a la petición que lo abrió. Un Pool de `pg` guarda
 * conexiones para reutilizarlas entre peticiones, y en la siguiente ya están
 * muertas — de ahí los "Failed query" y los cuelgues intermitentes, que además
 * empeoraban con la carga (cuantas más peticiones, más conexiones rancias).
 * Ni Hyperdrive ni el pooler de Neon lo arreglan: el problema está en el lado
 * del cliente.
 */
function isWorkers(): boolean {
  // Via globalThis y no `navigator` a pelo: el tsconfig del backend es de Node
  // y no trae los tipos DOM, asi que referenciar `navigator` directamente no
  // compila ("Cannot find name 'navigator'").
  const g = globalThis as { navigator?: { userAgent?: string } };
  return g.navigator?.userAgent === "Cloudflare-Workers";
}

export function getDb(): Db {
  if (_db) return _db;

  // process.env por delante de env.DATABASE_URL: en Workers, src/worker.ts
  // puede sustituir DATABASE_URL en la primera petición, DESPUÉS de que
  // config/env.ts haya congelado su copia en el import.
  const connectionString = process.env.DATABASE_URL || env.DATABASE_URL;

  if (isWorkers()) {
    // Driver HTTP de Neon: sin sockets persistentes, una petición HTTP por
    // consulta. Es lo único que encaja con el modelo de isolates.
    //
    // LIMITACIÓN CONOCIDA: no admite transacciones interactivas
    // (`db.transaction(async (tx) => ...)`). Hoy eso solo afecta a
    // services/roles.ts y services/patient-imports/* — administración e
    // importación, no la superficie pública del sitio. Esas rutas fallarán en
    // Workers hasta que se migren a `db.batch()` o se muevan a un runtime Node.
    //
    // `fetchFunction` es GLOBAL en el driver: se fija aqui, junto a la unica
    // construccion del cliente HTTP, para que no haya forma de crear un cliente
    // sin la politica de reintentos.
    neonConfig.fetchFunction = retryingFetch;
    _db = drizzleHttp(neon(connectionString), { schema }) as unknown as Db;
    return _db;
  }

  // Node (docker-compose): Pool normal, con transacciones completas.
  const pool = new Pool({ connectionString });
  _db = drizzle(pool, { schema });
  return _db;
}

/**
 * Guard heredado del app Next (lib/db.ts): true cuando hay DATABASE_URL. En el
 * backend SIEMPRE la hay (validada en config/env, fail-fast), pero el código de
 * sync conserva sus ramas `if (!hasDbEnv())` para preservar la semántica exacta.
 */
export function hasDbEnv(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export { schema };
