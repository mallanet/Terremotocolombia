"use client";

/**
 * Celdas que contienen una foto.
 *
 * Una foto llega como data-URL (base64) o como URL del CDN. Volcarla cruda en
 * la tabla metería cientos de miles de caracteres en una celda y la dejaría
 * inservible, así que el texto se colapsa a una marca y la imagen se pinta
 * como miniatura.
 *
 * Esto vive aparte de `renderCell` porque esa función devuelve texto y la fila
 * usa su resultado como identificador (`renderCell(row.id)`): si devolviera un
 * nodo de React, el id se rompería.
 */
const PHOTO_URL = /^https?:\/\/\S+\.(jpe?g|png|webp)$/i;

export const PHOTO_PLACEHOLDER = "📷 Foto adjunta";

export function isPhotoValue(value: unknown): value is string {
  return (
    typeof value === "string" && (value.startsWith("data:image/") || PHOTO_URL.test(value))
  );
}

export function PhotoCell({ value }: { value: string }) {
  return (
    <a href={value} target="_blank" rel="noreferrer" title="Abrir la foto en grande">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={value}
        alt="Foto adjunta"
        className="h-12 w-12 rounded object-cover ring-1 ring-gray-200"
      />
    </a>
  );
}
