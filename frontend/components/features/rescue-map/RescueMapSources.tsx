"use client";

import { externalLinkProps } from "./helpers";
import { getRescueMapCopy } from "./copy";
import type {
  RescueMapIncident,
  RescueMapLanguage,
  RescueMapMappingSnapshot,
} from "@/lib/rescue-map";

interface RescueMapSourcesProps {
  language: RescueMapLanguage;
  incident: RescueMapIncident;
  mapping: RescueMapMappingSnapshot;
  incidentPath: string;
  mappingPath: string;
}

// Four sources that the editorial copy frames as the "what to trust first"
// list. Kept here, not in the parent, because no other UI depends on the
// ordering.
const PRIORITY_SOURCE_IDS = new Set([
  "copernicus-emsr916",
  "sgc-seismic-viewer",
  "dimar-bulletin-01",
  "ungrd-initial-response",
]);

// Disclosure that surfaces primary sources, the situation link, and the
// raw JSON feeds. The "↗" is decorative (`aria-hidden`) so screen readers
// hear the link label, not the arrow glyph.
export default function RescueMapSources({
  language,
  incident,
  mapping,
  incidentPath,
  mappingPath,
}: RescueMapSourcesProps) {
  const text = getRescueMapCopy(language);
  const prioritySources = incident.sources.filter((source) =>
    PRIORITY_SOURCE_IDS.has(source.id),
  );
  return (
    <details className="e-rescue-details">
      <summary>{text.sources}</summary>
      <div className="e-rescue-details-body">
        <h2>{text.sourceTitle}</h2>
        <p className="e-rescue-package-copy">{text.sourceNote}</p>
        <ul className="e-rescue-source-list">
          <li>
            <a href={mapping.situationUrl} {...externalLinkProps}>
              Copernicus EMSR916 <span aria-hidden>↗</span>
            </a>
          </li>
          {prioritySources.map((source) => (
            <li key={source.id}>
              <a href={source.url} {...externalLinkProps}>
                {source.label[language]} <span aria-hidden>↗</span>
              </a>
            </li>
          ))}
        </ul>
        <div className="e-rescue-data-links">
          <a href={incidentPath}>{text.registry}</a>
          <a href={mappingPath}>{text.mapping}</a>
        </div>
      </div>
    </details>
  );
}
