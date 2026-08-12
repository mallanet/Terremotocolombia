"use client";

import InstallRescueMap from "./InstallRescueMap";
import OfflinePackages from "./OfflinePackages";
import { getRescueMapCopy } from "./copy";
import type {
  RescueMapIncident,
  RescueMapLanguage,
  RescueMapMappingSnapshot,
} from "@/lib/rescue-map";

interface RescueMapOfflineToolsProps {
  language: RescueMapLanguage;
  incident: RescueMapIncident;
  mapping: RescueMapMappingSnapshot;
}

// Wraps the install instructions (`<InstallRescueMap>`) and the offline
// package manager (`<OfflinePackages>`) so the rail can list "Install and
// offline mode" as one disclosure without the section growing.
export default function RescueMapOfflineTools({
  language,
  incident,
  mapping,
}: RescueMapOfflineToolsProps) {
  const text = getRescueMapCopy(language);
  return (
    <details className="e-rescue-details">
      <summary>{text.offlineTools}</summary>
      <div className="e-rescue-details-body">
        <InstallRescueMap language={language} />
        <h3>{text.data}</h3>
        <OfflinePackages
          incident={incident}
          mapping={mapping}
          language={language}
        />
      </div>
    </details>
  );
}
