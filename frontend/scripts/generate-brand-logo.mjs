// Genera lib/generated/brand-logo.ts a partir de public/brand/logo-claro.svg.
//
// Por que existe este paso:
//
// La tarjeta social (lib/social-preview.tsx) necesita los BYTES del logo, no
// una URL. Leerlo con node:fs en tiempo de peticion funciona en `next build`
// (Node, con public/ en disco) pero revienta en el Worker de Cloudflare, donde
// solo existe el bundle:
//
//   Error: no such file or directory, readAll '/bundle/public/brand/logo-claro.png'
//
// Asi que el logo se incrusta en el codigo como data URI en tiempo de build.
// Se usa el SVG y no el PNG a proposito: ~4 KB en vez de ~90 KB en base64, y
// vectorial (nitido a cualquier tamaño). La fuente de verdad sigue siendo el
// asset de marca, no una copia pegada a mano: si diseño actualiza el SVG, la
// tarjeta social le sigue.
//
// Mismo patron que scripts/sync-deployment-config.mjs.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "..", "public", "brand", "logo-claro.svg");
const destDir = join(here, "..", "lib", "generated");
const dest = join(destDir, "brand-logo.ts");

const raw = readFileSync(src, "utf8");

// satori (el motor de next/og) rasteriza el SVG con resvg. No damos por supuesto
// que resuelva <style> + class: resolvemos las clases a atributos `fill` y
// borramos el bloque <defs><style>. Lo que queda es SVG plano de presentacion.
const classFills = new Map();
for (const [, cls, fill] of raw.matchAll(
  /\.([\w-]+)\s*\{\s*fill:\s*(#[0-9a-fA-F]{3,8})\s*;?\s*\}/g,
)) {
  classFills.set(cls, fill);
}

if (classFills.size === 0) {
  throw new Error(
    `[generate-brand-logo] no se encontro ninguna clase con fill en ${src}. ` +
      `Si el SVG de marca cambio de estructura, revisar este script.`,
  );
}

let svg = raw
  // Cabecera XML y bloque de estilos: sobran una vez inlineados los fills.
  .replace(/<\?xml[^>]*\?>/g, "")
  .replace(/<defs>[\s\S]*?<\/defs>/g, "")
  .replace(/class="([\w-]+)"/g, (_match, cls) => {
    const fill = classFills.get(cls);
    if (!fill) {
      throw new Error(
        `[generate-brand-logo] clase "${cls}" sin fill declarado en ${src}.`,
      );
    }
    return `fill="${fill}"`;
  })
  // Colapsar espacio en blanco: el data URI viaja en el bundle del Worker.
  .replace(/>\s+</g, "><")
  .trim();

// Comprobacion de humo: si quedan clases sin resolver, el logo saldria negro.
if (svg.includes("class=")) {
  throw new Error(
    `[generate-brand-logo] quedaron atributos class= sin resolver en el SVG.`,
  );
}

const viewBox = svg.match(/viewBox="([\d.\s-]+)"/);
if (!viewBox) {
  throw new Error(`[generate-brand-logo] el SVG no declara viewBox.`);
}
const [, , vbW, vbH] = viewBox[1].trim().split(/\s+/).map(Number);

// `utf8` en vez de base64: pesa menos y el diff del fichero generado sigue
// siendo legible cuando alguien lo inspecciona.
const dataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const out = `// GENERADO por scripts/generate-brand-logo.mjs — no editar a mano.
// Fuente: public/brand/logo-claro.svg
//
// Se incrusta el logo como data URI porque el Worker de Cloudflare no tiene
// public/ en disco en tiempo de peticion. Ver el script para el contexto.

/** Logo Mallanet (variante clara) como data URI SVG, listo para <img src>. */
export const BRAND_LOGO_DATA_URI =
  ${JSON.stringify(dataUri)};

/** Relacion de aspecto intrinseca del logo (ancho / alto). */
export const BRAND_LOGO_ASPECT = ${(vbW / vbH).toFixed(4)};
`;

mkdirSync(destDir, { recursive: true });
writeFileSync(dest, out, "utf8");
console.log(
  `[generate-brand-logo] ${src} -> ${dest} (${(dataUri.length / 1024).toFixed(1)} KiB data URI)`,
);
