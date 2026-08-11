import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import SubPageShell from "@/components/layout/SubPageShell";
import VolunteerForm from "@/components/features/volunteers/VolunteerForm";

export const metadata: Metadata = pageMetadata({
  title: "Registrarme como voluntario",
  description: "Ofrece tu tiempo en labores de rescate, apoyo logístico o asistencia médica. Iniciativa ciudadana, independiente y no gubernamental.",
  path: "/voluntario",
});

export default function VoluntarioPage() {
  return (
    <SubPageShell breadcrumb="Voluntario" path="/voluntario">
      <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="e-card rounded-[24px] bg-white p-6 sm:p-10">
          <h1 className="mb-2 text-[22px] font-bold text-slate-900 sm:text-2xl">
            Registrarme como voluntario
          </h1>
          <p className="mb-8 text-sm text-slate-600 sm:text-[15px]">
            El equipo de coordinación se pondrá en contacto contigo en las próximas horas.
          </p>

          <VolunteerForm />
        </div>
      </section>
    </SubPageShell>
  );
}
