import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import SubPageShell from "@/components/layout/SubPageShell";
import PsychPortal from "@/components/features/psychology/PsychPortal";

export const metadata: Metadata = pageMetadata({
  title: "Portal de psicólogos",
  description:
    "Portal exclusivo para psicólogos y profesionales de salud mental de la red de respuesta al sismo en Colombia. Iniciativa ciudadana, independiente y no gubernamental.",
  path: "/psicologia",
});

export default function PsicologiaPage() {
  return (
    <SubPageShell breadcrumb="Psicólogos" path="/psicologia">
      <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <header className="mb-6">
          <h1 className="mb-2 text-[22px] font-bold text-slate-900 sm:text-2xl">
            Portal de psicólogos
          </h1>
          <p className="text-sm text-slate-600 sm:text-[15px]">
            Espacio exclusivo para el equipo de salud mental: apoyo psicosocial
            a personas afectadas y cuidado de quienes rescatan.
          </p>
        </header>

        <PsychPortal />
      </section>
    </SubPageShell>
  );
}
