"use client";

import { getRescueMapCopy } from "./copy";
import {
  firstProduct,
  type RescueMapLanguage,
  type RescueMapMappingSnapshot,
} from "@/lib/rescue-map";

interface RescueMapAoiListProps {
  language: RescueMapLanguage;
  mapping: RescueMapMappingSnapshot;
  selectedAoiId: string | null;
  onSelect: (aoiId: string) => void;
  onClear: () => void;
}

// Grid of Copernicus AOIs. Mirrors what the map shows; selecting a row
// triggers the same selection flow as clicking the map (parent owns the
// side-effects via `onSelect`). The data-testid format (`rescue-aoi-02`,
// `rescue-aoi-03`, ...) is asserted by `mapa-de-rescate.spec.ts`.
export default function RescueMapAoiList({
  language,
  mapping,
  selectedAoiId,
  onSelect,
  onClear,
}: RescueMapAoiListProps) {
  const text = getRescueMapCopy(language);
  return (
    <section className="e-rescue-section" aria-labelledby="rescue-aoi-heading">
      <div className="e-rescue-section-heading">
        <h2 id="rescue-aoi-heading">{text.areas}</h2>
        {selectedAoiId ? (
          <button
            type="button"
            className="e-rescue-overview"
            onClick={onClear}
          >
            {text.overview}
          </button>
        ) : null}
      </div>
      <p className="e-rescue-boundary-warning">{text.areaBoundaryWarning}</p>
      <div className="e-rescue-aoi-list">
        {mapping.aois.map((aoi) => {
          const aoiProduct = firstProduct(aoi);
          return (
            <button
              key={aoi.id}
              type="button"
              className="e-rescue-aoi"
              aria-pressed={aoi.id === selectedAoiId}
              onClick={(event) => {
                onSelect(aoi.id);
                if (event.detail > 0) event.currentTarget.blur();
              }}
              data-testid={`rescue-aoi-${String(aoi.number).padStart(2, "0")}`}
            >
              <span className="e-rescue-aoi-code">
                AOI {String(aoi.number).padStart(2, "0")} ·{" "}
                {aoiProduct?.type ?? "—"}
              </span>
              <strong>{aoi.name[language]}</strong>
              <small>
                {aoiProduct?.typeLabel[language]} · {text.waiting}
              </small>
            </button>
          );
        })}
      </div>
    </section>
  );
}
