/**
 * Métricas Prometheus del backend (formato `prom-client`). Expone `/metrics`
 * (texto plano que Prometheus/Alloy scrapea) y un middleware que instrumenta
 * CADA request HTTP: total, errores y duración por método/ruta/status.
 *
 * Cómo llega al command center: los pods de prod NO empujan; solo EXPONEN
 * `/metrics`. Grafana Alloy (DaemonSet en k3s) lo scrapea y lo empuja al VPS de
 * observability (ver observability/). Alloy enriquece con `tier`/`pod`/`namespace`
 * desde las labels del pod, así que aquí NO hace falta auto-identificar el tier.
 *
 * Cardinalidad: la label `route` usa el PATRÓN de ruta de Express
 * (`/api/missing/:id`), no el path crudo, para no explotar en series por cada id.
 */
import http from "http";
import client, { Counter, Histogram, Registry, collectDefaultMetrics } from "prom-client";
import type { Request, Response, NextFunction } from "express";
import { env } from "@/config/env";
import { hashIp } from "@/lib/client-ip";
import { databaseTelemetry, requestId } from "@/lib/request-context";

export const register = new Registry();

// Métricas por defecto del proceso/runtime (heap de V8, event-loop lag, CPU,
// GC, handles…). Útiles para vigilar salud del pod, no solo el HTTP.
//
// En Cloudflare Workers esto NO puede correr: prom-client llama a
// `process.cpuUsage()`, que el runtime no implementa y lanza. Como la llamada
// está en ámbito de módulo, la excepción se propagaba por el import de
// server.ts y tumbaba la API ENTERA (todo a 1101, no solo /metrics).
//
// Se envuelve en try/catch en vez de detectar el runtime: lo que importa no es
// dónde corremos, sino si estas métricas se pueden recolectar. Las métricas
// HTTP de abajo (que son las que miramos) siguen funcionando en ambos sitios.
try {
  collectDefaultMetrics({ register });
} catch (err) {
  console.warn(
    "[metrics] métricas por defecto del runtime no disponibles:",
    err instanceof Error ? err.message : err,
  );
}

const LABELS = ["method", "route", "status_code"] as const;
const ACCESS_LOG_SAMPLE_RATE = 0.01;
const SLOW_REQUEST_SECONDS = 0.5;
const SLOW_DATABASE_MS = 250;

export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total de requests HTTP",
  labelNames: LABELS,
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "Duración de la request HTTP en segundos",
  labelNames: LABELS,
  // Buckets afinados para una API web: desde 10ms hasta 5s.
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

export const httpErrorsTotal = new Counter({
  name: "http_errors_total",
  help: "Total de respuestas HTTP de error (4xx + 5xx)",
  labelNames: LABELS,
  registers: [register],
});

export const httpDatabaseDuration = new Histogram({
  name: "http_database_duration_seconds",
  help: "Tiempo acumulado en Postgres por request HTTP",
  labelNames: LABELS,
  buckets: [0.005, 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

export const httpDatabaseQueries = new Histogram({
  name: "http_database_queries",
  help: "Cantidad de round trips a Postgres por request HTTP",
  labelNames: LABELS,
  buckets: [0, 1, 2, 4, 8, 16, 32, 64],
  registers: [register],
});

/**
 * Normaliza la ruta a su PATRÓN para acotar cardinalidad. Prefiere el patrón que
 * matcheó Express (`req.route.path`, p.ej. `/:id`), con su `baseUrl` (el prefijo
 * del router, p.ej. `/api/missing`). Si no hay patrón (404, middleware), colapsa
 * segmentos largos/dinámicos (ids, uuids) a `/:id`.
 */
function normalizeRoute(req: Request): string {
  if (req.route?.path) {
    const base = req.baseUrl || "";
    const path = typeof req.route.path === "string" ? req.route.path : "";
    return `${base}${path}` || req.path;
  }
  return req.path.replace(/\/[0-9a-fA-F-]{8,}/g, "/:id").replace(/\/\d+/g, "/:id");
}

/**
 * Middleware: mide la request al terminar la respuesta. No toca el body ni
 * cabeceras sensibles; solo método, patrón de ruta y status.
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const durationS = Number(process.hrtime.bigint() - start) / 1e9;
    const route = normalizeRoute(req);
    const labels = { method: req.method, route, status_code: String(res.statusCode) };
    const db = databaseTelemetry();
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, durationS);
    httpDatabaseDuration.observe(labels, db.dbDurationMs / 1000);
    httpDatabaseQueries.observe(labels, db.dbQueries);
    if (res.statusCode >= 400) httpErrorsTotal.inc(labels);

    // Keep every 5xx and sample routine traffic. Logs contain only the salted IP
    // hash, never the raw address. Cloudflare edge tooling remains the place to
    // block abusive IPs; application logs are for trends and correlation.
    const mustLog =
      res.statusCode >= 500 ||
      durationS >= SLOW_REQUEST_SECONDS ||
      db.dbDurationMs >= SLOW_DATABASE_MS ||
      db.dbRetries > 0 ||
      db.dbFailures > 0;
    if (!mustLog && Math.random() >= ACCESS_LOG_SAMPLE_RATE) return;
    try {
      console.log({
        t: "access",
        request_id: requestId(req),
        cf_ray: typeof req.headers["cf-ray"] === "string" ? req.headers["cf-ray"] : undefined,
        method: req.method,
        route,
        status: res.statusCode,
        dur_ms: Math.round(durationS * 1000),
        db_queries: db.dbQueries,
        db_ms: Math.round(db.dbDurationMs),
        db_retries: db.dbRetries,
        db_failures: db.dbFailures,
        ip_hash: hashIp(req),
      });
    } catch {
      // Nunca dejar que el logging tumbe la request.
    }
  });
  next();
}

/**
 * Servidor de métricas SEPARADO, en su propio puerto (METRICS_PORT, default
 * 9090). AISLAMIENTO: el LB público (mapa-api-lb) solo enruta el puerto de la
 * app (:8080), nunca este — así `/metrics` es INACCESIBLE desde internet
 * (defensa primaria, ver observability/). Alloy (DaemonSet en k3s) lo scrapea
 * pod-a-pod por la red interna.
 *
 * Defensa en profundidad: si METRICS_TOKEN está seteado, exige
 * `Authorization: Bearer <token>`; sin token (dev local) queda abierto. Solo
 * responde a GET /metrics; cualquier otra cosa -> 404.
 *
 * Devuelve el http.Server para poder cerrarlo en tests.
 */
export function startMetricsServer(): http.Server {
  const port = env.METRICS_PORT;
  const token = env.METRICS_TOKEN;
  const server = http.createServer((req, res) => {
    if (req.method !== "GET" || (req.url ?? "").split("?")[0] !== "/metrics") {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }
    if (token && req.headers.authorization !== `Bearer ${token}`) {
      res.statusCode = 401;
      res.end("Unauthorized");
      return;
    }
    register
      .metrics()
      .then((body) => {
        res.setHeader("Content-Type", register.contentType);
        res.end(body);
      })
      .catch(() => {
        res.statusCode = 500;
        res.end("metrics error");
      });
  });
  server.listen(port, () => {
    console.log(`mapa-backend metrics escuchando en :${port} (/metrics)`);
  });
  return server;
}

export { client };
