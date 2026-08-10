/**
 * Declaracion minima de `cloudflare:node`, el modulo integrado del runtime de
 * Workers que permite servir un servidor HTTP de Node (ver src/worker.ts).
 *
 * Se declara a mano en vez de instalar @cloudflare/workers-types: ese paquete
 * redefine globales (fetch, Request, Response...) que ya trae @types/node, y
 * mezclarlos en el mismo tsconfig genera conflictos en TODO el backend, que es
 * codigo de Node salvo este unico fichero.
 */
declare module "cloudflare:node" {
  export function httpServerHandler(options: { port: number }): {
    fetch(request: Request, env: unknown, ctx: unknown): Promise<Response>;
  };
}
