"use client";

/** Presentación reusable de UN `RecordDisplayDTO`: nombre + chips de
 *  población/edad/procedencia + PRN. Sin foto — ver nota de `types.ts`
 *  (`RecordDisplayDTO`) y el informe de U11: el contrato del backend no trae
 *  ningún campo de imagen todavía; el slot queda preparado (comentario
 *  abajo) para cuando lo traiga. */
import { populationLabel, type RecordDisplayDTO } from "./types";

export function RecordSummary({
  record,
  label,
}: {
  record: RecordDisplayDTO | null;
  /** "Registro A"/"Registro B" — para cuando el registro es null (no debería
   *  pasar en la práctica, pero el DTO lo permite). */
  label?: string;
}) {
  if (!record) {
    return <p className="text-sm text-gray-400">{label ?? "Registro"} no disponible.</p>;
  }

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      {/* Slot de foto: el contrato de person-links.router.ts (RecordDisplay)
          no expone una URL de imagen hoy, aunque missing_persons/
          hospital_patients/unidentified_persons SÍ tienen columna `photo` en
          el schema — ver informe de U11. Si el backend la agrega
          (p.ej. `record.photoUrl`), este es el lugar para renderizarla. */}
      <p className="font-medium">{record.name || "(sin nombre)"}</p>
      <div className="flex flex-wrap gap-1">
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
          {populationLabel(record.population)}
        </span>
        {record.age !== null && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
            {record.age} años
          </span>
        )}
        {record.source && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
            {record.source}
          </span>
        )}
      </div>
      <p className="font-mono text-xs text-gray-500">{record.prn}</p>
      {record.outcome === "registro eliminado" && (
        <p className="text-xs font-semibold text-red-600">Registro eliminado</p>
      )}
    </div>
  );
}

const EVIDENCE_FIELDS: { key: string; label: string }[] = [
  { key: "documento", label: "Documento" },
  { key: "nombre", label: "Nombre" },
  { key: "edad", label: "Edad" },
];

/**
 * Coloreado por campo (R12 §7.4): verde exacto / rojo conflicto / gris sin
 * dato. En fase 1 el backend SOLO emite tokens "exact" (`buildEvidence` en
 * matcher/propose.ts — el matcher determinista no calcula fuzzy/conflicto
 * todavía); "conflict"/"fuzzy"/"phonetic" se soportan aquí de forma
 * defensiva para cuando fase 2 los agregue (ámbar explícitamente fuera de
 * alcance de U11 salvo este soporte defensivo — ver plan). Los campos que
 * `evidenceClass` no comparó (p.ej. "nombre"/"edad" en un match por
 * documento) no están en el objeto `evidence` — eso ES el caso "gris/sin
 * dato", no un bug.
 */
export function EvidenceChips({ evidence }: { evidence: Record<string, string> | null }) {
  return (
    <div className="flex flex-wrap gap-1">
      {EVIDENCE_FIELDS.map(({ key, label }) => {
        const token = evidence?.[key];
        const { cls, text } =
          token === "exact"
            ? { cls: "bg-green-100 text-green-800", text: "coincide" }
            : token === "conflict"
              ? { cls: "bg-red-100 text-red-800", text: "conflicto" }
              : token === "fuzzy" || token === "phonetic"
                ? { cls: "bg-amber-100 text-amber-800", text: "parcial" }
                : { cls: "bg-gray-100 text-gray-500", text: "sin dato" };
        return (
          <span key={key} className={`rounded-full px-2 py-0.5 text-xs ${cls}`}>
            {label}: {text}
          </span>
        );
      })}
    </div>
  );
}
