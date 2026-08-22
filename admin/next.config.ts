import type { NextConfig } from "next";
import { APP_BUILD_SHA_HEADER, getAppBuildSha } from "./src/shared/build-identity";

// Cabeceras de seguridad para TODA respuesta. Un panel admin importa más que el
// sitio público: bloqueamos embebido en iframe (clickjacking sobre acciones de
// admin), sniffing de MIME, y lo marcamos noindex globalmente (el login no debe
// indexarse — el robots:false por página no cubre /robots.txt ni esta cabecera).
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: APP_BUILD_SHA_HEADER, value: getAppBuildSha() },
];

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle. Required for container deployments.
  // transpilePackages compiles the TypeScript source of the file: contracts
  // package. Keep turbopack.root on this package so standalone output stays
  // flat for the VPS image.
  output: "standalone",
  transpilePackages: ["@mallanet/contracts"],

  // Anti version-skew para el roll multi-pod (mismo problema que resolvió el
  // frontend): `next build` estampa un build-id aleatorio, así que 2 pods del
  // mismo deploy servirían /_next/static/<id>/… distintos → ChunkLoadError sin
  // sticky sessions en el LB. Derivar el id del commit SHA hace que coincidan;
  // deploymentId fuerza recarga limpia cuando una pestaña vieja pega a un pod
  // nuevo. APP_BUILD_SHA llega en BUILD time (build-arg → ENV); "dev" en local.
  generateBuildId: async () => getAppBuildSha(),
  deploymentId: process.env.APP_BUILD_SHA || undefined,

  // Sirve /_next/static desde el CDN (R2) si está configurado, para que un chunk
  // nunca dependa de pegar al pod correcto mid-deploy. Sin setear (local) → la
  // app sirve los assets como siempre.
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX
    ? process.env.NEXT_PUBLIC_ASSET_PREFIX.replace(/\/$/, "")
    : undefined,

  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
