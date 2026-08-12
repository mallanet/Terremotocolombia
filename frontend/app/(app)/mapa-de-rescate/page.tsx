import type { Metadata, Viewport } from "next";
import {
  HeroDesktopNav,
  MobileStickyNav,
} from "@/components/layout/SectionNav";
import SiteFooter from "@/components/layout/SiteFooter";
import RescueMapExperience from "@/components/features/rescue-map/RescueMapExperience";
import { pageMetadata } from "@/lib/metadata";
import { SITE_PRODUCT_NAME } from "@/lib/site";
import type {
  RescueMapIncident,
  RescueMapMappingSnapshot,
} from "@/lib/rescue-map";
import incidentData from "@/public/data/incidents/colombia-2026-08-10-san-jose-del-palmar.json";
import mappingData from "@/public/data/incidents/colombia-2026-08-10-emsr916-map.json";

const description =
  "Mapa operacional del sismo M7.4 en Colombia con epicentro, las cuatro áreas oficiales Copernicus EMSR916 y funcionamiento offline para terreno.";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Mapa de rescate",
    description,
    path: "/mapa-de-rescate",
  }),
  manifest: "/mapa-de-rescate.webmanifest",
  appleWebApp: {
    capable: true,
    title: `${SITE_PRODUCT_NAME} · Mapa`,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#0f2154",
};

export default function MapaDeRescatePage() {
  return (
    <>
      <HeroDesktopNav />
      <RescueMapExperience
        initialIncident={incidentData as RescueMapIncident}
        initialMapping={mappingData as RescueMapMappingSnapshot}
      />
      <SiteFooter />
      <MobileStickyNav />
    </>
  );
}
