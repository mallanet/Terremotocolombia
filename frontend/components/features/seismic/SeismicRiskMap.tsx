"use client";

import dynamic from "next/dynamic";
import { MapLoading } from "@/components/ui/SectionLoading";

const SeismicRiskLeafletMap = dynamic(
  () => import("@/components/features/seismic/SeismicRiskLeafletMap"),
  {
    ssr: false,
    loading: () => (
      <MapLoading label="Cargando mapa de riesgo sísmico…" />
    ),
  },
);

export default function SeismicRiskMap() {
  return <SeismicRiskLeafletMap />;
}
