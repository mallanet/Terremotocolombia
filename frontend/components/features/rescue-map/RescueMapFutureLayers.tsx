"use client";

import { getRescueMapCopy } from "./copy";
import type { RescueMapLanguage } from "@/lib/rescue-map";

interface RescueMapFutureLayersProps {
  language: RescueMapLanguage;
}

// Placeholder rows for the layers that light up once verified data exists.
// The copy here intentionally explains the *absence* of data so users do not
// read missing tiles as a confidence statement about the field.
export default function RescueMapFutureLayers({
  language,
}: RescueMapFutureLayersProps) {
  const text = getRescueMapCopy(language);
  return (
    <section
      className="e-rescue-section"
      aria-labelledby="rescue-future-layers"
    >
      <div className="e-rescue-section-heading">
        <h2 id="rescue-future-layers">{text.futureLayers}</h2>
      </div>
      <div className="e-rescue-layers">
        <div className="e-rescue-layer-row">
          <strong>{text.needLayer}</strong>
          <span>{text.noNeeds}</span>
        </div>
        <div className="e-rescue-layer-row">
          <strong>{text.resourceLayer}</strong>
          <span>{text.noResources}</span>
        </div>
      </div>
      <p className="e-rescue-empty-copy">{text.futureLayerNote}</p>
    </section>
  );
}
