"use client";

import { getRescueMapCopy } from "./copy";
import type {
  RescueMapIncident,
  RescueMapLanguage,
  RescueMapMappingSnapshot,
} from "@/lib/rescue-map";

interface RescueMapEventDetailsProps {
  language: RescueMapLanguage;
  incident: RescueMapIncident;
  mapping: RescueMapMappingSnapshot;
}

// Earthquake facts (magnitude, depth, AOIs). The `<details>` wrapper keeps
// it collapsed by default on both layouts so the rail stays scannable.
export default function RescueMapEventDetails({
  language,
  incident,
  mapping,
}: RescueMapEventDetailsProps) {
  const text = getRescueMapCopy(language);
  return (
    <details className="e-rescue-details e-rescue-event-details">
      <summary>{text.eventDetails}</summary>
      <section
        className="e-rescue-facts"
        aria-label={language === "es" ? "Datos del evento" : "Event facts"}
      >
        <div className="e-rescue-fact">
          <span>{text.magnitude}</span>
          <strong>M{incident.event.magnitude}</strong>
        </div>
        <div className="e-rescue-fact">
          <span>{text.depth}</span>
          <strong>{incident.event.depthKm} km</strong>
        </div>
        <div className="e-rescue-fact">
          <span>{text.mapAreas}</span>
          <strong>{mapping.aois.length} AOI</strong>
        </div>
      </section>
    </details>
  );
}
