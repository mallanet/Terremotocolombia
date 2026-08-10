import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Adaptador de Next.js -> Cloudflare Workers.
//
// Config minima a proposito: sin cache incremental (R2/KV) todavia. Las paginas
// estaticas se sirven como assets y las dinamicas se renderizan en el Worker.
// Cuando haya backend y datos reales, valorar `incrementalCache` sobre R2.
export default defineCloudflareConfig();
