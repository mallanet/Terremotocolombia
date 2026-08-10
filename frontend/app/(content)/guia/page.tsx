import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import SubPageShell from "@/components/layout/SubPageShell";
import SurvivalGuide from "@/components/features/guide/SurvivalGuide";

export const metadata: Metadata = pageMetadata({
  title: "Guía rápida de emergencia",
  description:
    "Pasos esenciales antes, durante y después de un sismo. Cómo proteger a tu familia y solicitar ayuda.",
  path: "/guia",
});

export default function GuiaPage() {
  return (
    <SubPageShell
      breadcrumb="Guía rápida"
      path="/guia"
      article={{
        headline: "Guía rápida de emergencia ante un sismo",
        description:
          "Pasos esenciales antes, durante y después de un sismo. Cómo proteger a tu familia y solicitar ayuda.",
      }}
    >
      <SurvivalGuide />
    </SubPageShell>
  );
}
