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

const PORT = 8080;

const server = createServer(app);
server.listen(PORT);

export default httpServerHandler({ port: PORT });
