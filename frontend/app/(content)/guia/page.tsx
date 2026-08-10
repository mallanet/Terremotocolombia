import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import SubPageShell from "@/components/layout/SubPageShell";
import SurvivalGuide from "@/components/features/guide/SurvivalGuide";
import { CARDS } from "@/lib/data/survival-guide";
import { howToSchema } from "@/lib/jsonld";

const GUIDE_TITLE = "Guía rápida de emergencia ante un sismo";
const GUIDE_DESC =
  "Pasos esenciales antes, durante y después de un sismo. Cómo proteger a tu familia y solicitar ayuda.";
/** Fecha editorial del contenido de la guía (ISO). */
const GUIDE_PUBLISHED = "2026-08-10";

export const metadata: Metadata = pageMetadata({
  title: "Guía rápida de emergencia",
  description: GUIDE_DESC,
  path: "/guia",
});

export default function GuiaPage() {
  const howTo = howToSchema({
    name: GUIDE_TITLE,
    description: GUIDE_DESC,
    path: "/guia",
    steps: CARDS.map((card) => ({
      id: card.id,
      name: card.title,
      text: [
        card.subtitle,
        ...card.bullets.map((b) => b.text),
        ...(card.tip ? [`Consejo: ${card.tip}`] : []),
      ].join(" "),
    })),
  });

  return (
    <SubPageShell
      breadcrumb="Guía rápida"
      path="/guia"
      article={{
        headline: GUIDE_TITLE,
        description: GUIDE_DESC,
        datePublished: GUIDE_PUBLISHED,
        dateModified: GUIDE_PUBLISHED,
      }}
      extraSchema={[howTo]}
    >
      <SurvivalGuide />
    </SubPageShell>
  );
}
