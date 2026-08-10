/**
 * Entrypoint de Cloudflare Workers para el backend Express.
 *
 * La app de Express NO se reescribe: `src/server.ts` ya exporta `app` y deja el
 * `listen()` detras de un guard de entrypoint, asi que aqui solo se envuelve.
 * Este es el patron documentado por Cloudflare: servidor creado en ambito de
 * modulo y `httpServerHandler` como default export.
 *
 * NO se inyecta la cadena de Hyperdrive. Se intento y era contraproducente: en
 * Workers el driver es el HTTP de Neon (ver src/db/index.ts), que necesita una
 * URL de Neon de verdad. Al sobrescribir DATABASE_URL con la cadena local de
 * Hyperdrive, el driver HTTP no podia usarla y fallaban casi todas las queries.
 *
 * La configuracion de Hyperdrive sigue creada en la cuenta por si mas adelante
 * se vuelve a un driver TCP; hoy no se usa.
 */
import { createServer } from "node:http";
import { httpServerHandler } from "cloudflare:node";
import { app } from "./server.js";
import { backfill, isEmpty, syncFromFeed } from "./services/earthquakes.js";
import { runGeocode } from "./services/geocode-batch.js";
import {
  CRON_EARTHQUAKES,
  CRON_GEOCODE,
  dispatchCron,
} from "./services/cron-jobs.js";
import { registerJobBindings } from "./lib/job-dispatch.js";

// El servidor se crea en ambito de modulo y NO se mueve dentro de fetch():
// hacerlo daba 500/503 intermitentes porque cada isolate levantaba el suyo y la
// primera peticion se colgaba.
const server = createServer(app);

// Se le pasa el SERVIDOR, no `{ port }`.
//
// Con la forma `{ port }` hay que llamar a `server.listen(PORT)` a mano, y esa
// llamada no se puede esperar en ambito de modulo: una peticion que entra en un
// isolate recien creado, antes de que el listen se complete, no encuentra
// servidor donde enrutar y se va en 503 — sin dejar rastro en el errorHandler de
// Express, que es justo lo que veiamos (503 en /api/earthquakes sin ningun log
// "Unhandled error" correspondiente).
//
// La forma que recibe el servidor es la documentada como "simplified" y llama a
// `listen()` ella misma cuando hace falta, asi que el runtime es el dueño del
// ciclo de vida y la carrera desaparece. Ojo: con este handler el puerto es solo
// una CLAVE DE ENRUTADO entre servidores del mismo Worker, no un puerto de red.
const nodeHandler = httpServerHandler(server);

interface ScheduledController {
  cron: string;
  scheduledTime: number;
  noRetry(): void;
}
interface Ctx {
  waitUntil(p: Promise<unknown>): void;
}
type WorkerEnv = Record<string, string | undefined>;

/**
 * Sync del catalogo de sismos (USGS), como Cron Trigger.
 *
 * Sustituye al worker de BullMQ, que no esta desplegado. Se puede hacer porque
 * `services/earthquakes.ts` expone `syncFromFeed`/`backfill` como funciones
 * puras: BullMQ solo las agendaba. Sin Redis, sin proceso aparte.
 *
 * `bridgeEnv` copia vars y secrets del Worker a process.env porque
 * `config/env.ts` y `getBbox()` leen de ahi. En el handler, no arriba: leer
 * bindings en ambito global lanza "Disallowed operation called within global
 * scope".
 */
function bridgeEnv(env: WorkerEnv): void {
  for (const [k, v] of Object.entries(env)) {
    if (typeof v === "string" && process.env[k] === undefined) process.env[k] = v;
  }
}

/**
 * Sync del catalogo de sismos. Cuerpo INTACTO respecto a cuando era el unico
 * trabajo del handler: esto corre en produccion sirviendo la respuesta al
 * terremoto, y el port a multi-cron no es momento de cambiarle nada.
 */
async function syncEarthquakes(now: number): Promise<void> {
  try {
    // Tabla vacia -> backfill de los ultimos dias; si no, solo el feed
    // incremental, que es una peticion y unas pocas filas.
    const r = (await isEmpty()) ? await backfill(now) : await syncFromFeed(now);
    console.log(
      `[cron:sismos] origen=${r.source} bajados=${r.fetched} en_region=${r.matched} escritos=${r.upserted}`,
    );
  } catch (err) {
    console.error(
      "[cron:sismos] fallo:",
      err instanceof Error ? err.message : String(err),
    );
    // Se relanza a proposito, SIN noRetry(): el upsert es idempotente
    // (clave = id del evento USGS), asi que reintentar es seguro y
    // preferible a perder una ventana de sismos.
    throw err;
  }
}

/**
 * Geocodificacion de ubicaciones pendientes.
 *
 * Acotada por cantidad y por tiempo con los defaults de runGeocode (20
 * ubicaciones, ~1 req/s a Nominatim): una invocacion programada tiene
 * presupuesto limitado, y Nominatim pide cadencia suave. Drena la cola poco a
 * poco en vez de intentar vaciarla de una vez.
 *
 * Tambien se relanza el fallo sin noRetry(): el geocode es idempotente
 * (geocode_cache por clave normalizada y UPDATE solo donde lat IS NULL).
 */
async function geocodePending(): Promise<void> {
  try {
    const r = await runGeocode();
    console.log(
      `[cron:geocode] ubicaciones=${r.locations} nuevas=${r.geocodedNew} cache=${r.fromCache} fallidas=${r.failed} personas=${r.peopleUpdated}`,
    );
  } catch (err) {
    console.error(
      "[cron:geocode] fallo:",
      err instanceof Error ? err.message : String(err),
    );
    throw err;
  }
}

export default {
  fetch(request: Request, env: WorkerEnv, ctx: Ctx): Promise<Response> {
    // Idempotente y barato (un Map.set por binding). Va aqui porque `env` solo
    // existe dentro del handler: leerlo en ambito global lanza "Disallowed
    // operation called within global scope".
    registerJobBindings(env);
    return nodeHandler.fetch(request, env, ctx);
  },

  async scheduled(controller: ScheduledController, env: WorkerEnv, ctx: Ctx): Promise<void> {
    ctx.waitUntil(
      (async () => {
        bridgeEnv(env);
        // Los bindings de cola son objetos, asi que bridgeEnv (solo strings) no
        // los alcanza. Se registran aqui para que el seam de despacho los vea.
        registerJobBindings(env);
        const now = controller.scheduledTime || Date.now();
        await dispatchCron(controller.cron, now, {
          [CRON_EARTHQUAKES]: syncEarthquakes,
          [CRON_GEOCODE]: geocodePending,
        });
      })(),
    );
  },
};
