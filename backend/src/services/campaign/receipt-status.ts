/**
 * Regla que decide si una entrega cierra el compromiso o lo deja a medias.
 *
 * Vive aparte de receipts.ts porque es la única decisión de negocio del flujo
 * y se puede probar sin base de datos. "Completo" significa: de cada material
 * prometido llegó al menos lo prometido. Traer material de MÁS, o material que
 * no se había prometido, no penaliza — sigue siendo una entrega completa.
 */
import type { MaterialLine } from "@/db/campaign-schema";

export function totalsByMaterial(items: MaterialLine[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const item of items) {
    const quantity = Number(item.quantity ?? 0);
    if (!Number.isFinite(quantity)) continue;
    totals.set(item.material, (totals.get(item.material) ?? 0) + quantity);
  }
  return totals;
}

export function receiptStatus(
  pledged: MaterialLine[],
  received: MaterialLine[],
): "received" | "partial" {
  const got = totalsByMaterial(received);
  for (const [material, quantity] of totalsByMaterial(pledged)) {
    if ((got.get(material) ?? 0) < quantity) return "partial";
  }
  return "received";
}

export type ReceiptKind = "received" | "partial" | "walk_in";

/**
 * Lo que lee quien acaba de recibir el material. Va aquí, y no en la ruta,
 * para poder probar los tres casos sin base de datos: el texto es la única
 * señal que tiene el responsable de si el certificado quedó cerrado, y
 * decirle que sí cuando llegó la mitad es mentirle a él y al donante.
 */
export function receiptMessage(kind: ReceiptKind): string {
  switch (kind) {
    case "received":
      return "Entrega confirmada. El certificado de esa persona ya es válido.";
    case "partial":
      return "Anotado, pero llegó menos de lo prometido. El certificado queda a medias hasta que traiga el resto.";
    case "walk_in":
      return "Entrega anotada. Sumó al total del punto.";
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}
