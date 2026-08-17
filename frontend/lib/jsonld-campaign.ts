import { SITE_URL } from "@/lib/site";
import { deploymentConfig } from "@/lib/deployment-config";
import { materialLabel, type CampaignSite } from "@/lib/campaign-materials";
import type { JsonLdNode } from "@/lib/jsonld";

/**
 * Puntos de recolección como ItemList de lugares.
 *
 * Para qué sirve: la pregunta que la gente le hace a un buscador o a un
 * asistente es "dónde entrego cemento en <ciudad>". Esa respuesta necesita
 * dirección, horario y qué acepta cada punto, en datos y no solo en prosa.
 *
 * Solo salen los puntos ABIERTOS. Un punto pausado, lleno o cerrado no entra:
 * el marcado estructurado sobrevive en cachés y en respuestas de IA durante
 * días, y mandar a alguien con un bulto de cemento a una puerta cerrada es
 * peor que no responder.
 */
const POINTS_URL = `${SITE_URL}/reconstruccion#puntos`;

function placeNode(site: CampaignSite): JsonLdNode {
  const accepts = site.accepts.map(materialLabel).join(", ");
  const description = [site.schedule, accepts && `Recibe: ${accepts}.`]
    .filter(Boolean)
    .join(" · ");

  return {
    "@type": "Place",
    name: site.name,
    url: POINTS_URL,
    ...(description ? { description } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address,
      addressLocality: site.city,
      addressRegion: deploymentConfig.regionLabel,
    },
    ...(site.lat !== null && site.lng !== null
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: site.lat,
            longitude: site.lng,
          },
        }
      : {}),
  };
}

export function collectionPointsSchema(sites: CampaignSite[]): JsonLdNode | null {
  const open = sites.filter((site) => site.status === "active");
  if (open.length === 0) return null;

  return {
    "@type": "ItemList",
    name: "Puntos de recolección de material de construcción",
    itemListOrder: "https://schema.org/ItemListUnordered",
    numberOfItems: open.length,
    itemListElement: open.map((site, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: placeNode(site),
    })),
  };
}
