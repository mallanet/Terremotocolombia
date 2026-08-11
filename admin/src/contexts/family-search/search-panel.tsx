"use client";

/**
 * Búsqueda persistente de página (§7.1/R19): visible desde la cola Y la
 * ficha (vive en `family-search-admin.tsx`, por encima de ambas vistas — ver
 * ese archivo para cómo NO se pierde el scroll de la cola al navegar).
 *
 * Cuatro desenlaces de una búsqueda por PRN, todos distintos (R19 en el
 * plan):
 *  - formato inválido (símbolo de control no cuadra) — SOLO detectable en el
 *    cliente: `records/search` no distingue "PRN mal formado" de "PRN bien
 *    formado pero no registrado" (un PRN mal formado simplemente no
 *    normaliza y el backend lo trata como una búsqueda de nombre normal, sin
 *    resultados — mismo response shape que "no encontrado"). Por eso
 *    `prn-format.ts` reimplementa el codec puro del backend SOLO para esta
 *    distinción — ver ese archivo.
 *  - "PRN no encontrado" (bien formado, sin fila en person_records).
 *  - "registro eliminado" (bien formado, resuelve, pero tombstoneado —
 *    `RecordDisplayDTO.outcome`).
 *  - éxito → abre la ficha (cluster si tiene uno vivo, si no `standalone`).
 * Una entrada que NO tiene forma de PRN se trata como búsqueda por nombre
 * (acento/mayúscula-insensible, la misma tabla `records/search`).
 */
import { useState, type FormEvent } from "react";
import { Button, Input } from "@/src/ui";
import { fetchRecordsSearch } from "./api";
import { looksLikePrn, normalizePrnClientSide } from "./prn-format";
import { RecordSummary } from "./record-summary";
import type { FichaTarget, RecordDisplayDTO } from "./types";

type Outcome =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "format-error" }
  | { type: "not-found" }
  | { type: "tombstoned" }
  | { type: "name-results"; results: RecordDisplayDTO[]; query: string }
  | { type: "name-empty"; query: string }
  | { type: "error"; message: string };

function targetFor(record: RecordDisplayDTO): FichaTarget {
  return record.clusterId
    ? { type: "cluster", clusterId: record.clusterId }
    : { type: "standalone", record };
}

export function SearchPanel({ onOpenFicha }: { onOpenFicha: (target: FichaTarget) => void }) {
  const [value, setValue] = useState("");
  const [outcome, setOutcome] = useState<Outcome>({ type: "idle" });

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;

    if (looksLikePrn(trimmed)) {
      const normalized = normalizePrnClientSide(trimmed);
      if (!normalized) {
        setOutcome({ type: "format-error" });
        return;
      }
      setOutcome({ type: "loading" });
      try {
        const result = await fetchRecordsSearch(normalized);
        if (!result.exactPrnMatch) {
          setOutcome({ type: "not-found" });
          return;
        }
        if (result.exactPrnMatch.outcome === "registro eliminado") {
          setOutcome({ type: "tombstoned" });
          return;
        }
        setOutcome({ type: "idle" });
        onOpenFicha(targetFor(result.exactPrnMatch));
      } catch (error) {
        setOutcome({ type: "error", message: error instanceof Error ? error.message : "Error de búsqueda." });
      }
      return;
    }

    setOutcome({ type: "loading" });
    try {
      const result = await fetchRecordsSearch(trimmed);
      if (result.results.length === 0) {
        setOutcome({ type: "name-empty", query: trimmed });
        return;
      }
      setOutcome({ type: "name-results", results: result.results, query: trimmed });
    } catch (error) {
      setOutcome({ type: "error", message: error instanceof Error ? error.message : "Error de búsqueda." });
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded border p-3">
      <form className="flex items-end gap-2" onSubmit={submit}>
        <Input
          label="Buscar por PRN o nombre"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <Button type="submit" disabled={outcome.type === "loading"}>
          {outcome.type === "loading" ? "Buscando…" : "Buscar"}
        </Button>
      </form>

      {outcome.type === "format-error" && (
        <p role="alert" className="text-sm text-red-600">
          Formato de PRN inválido — revisa el código, probablemente un carácter mal transcrito.
        </p>
      )}
      {outcome.type === "not-found" && (
        <p role="alert" className="text-sm text-amber-700">
          PRN no encontrado.
        </p>
      )}
      {outcome.type === "tombstoned" && (
        <p role="alert" className="text-sm text-gray-600">
          Este PRN corresponde a un registro eliminado.
        </p>
      )}
      {outcome.type === "name-empty" && (
        <p className="text-sm text-gray-500">Sin resultados para “{outcome.query}”.</p>
      )}
      {outcome.type === "error" && (
        <p role="alert" className="text-sm text-red-600">
          {outcome.message}
        </p>
      )}
      {outcome.type === "name-results" && (
        <ul className="flex flex-col gap-2">
          {outcome.results.map((record) => (
            <li
              key={record.prn}
              className="flex items-center justify-between gap-2 rounded border p-2 text-sm"
            >
              <RecordSummary record={record} />
              <Button type="button" variant="ghost" onClick={() => onOpenFicha(targetFor(record))}>
                Ver ficha
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
