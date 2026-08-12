import type { Metadata } from "next";
import { HardHat, Laptop } from "lucide-react";
import { pageMetadata } from "@/lib/metadata";
import SubPageShell from "@/components/layout/SubPageShell";
import VolunteerForm from "@/components/features/volunteers/VolunteerForm";
import { VolunteerPostSubmitBanner } from "@/components/features/volunteers/VolunteerPostSubmitBanner";

export const metadata: Metadata = pageMetadata({
  title: "Súmate como voluntario",
  description:
    "Voluntariado digital y en terreno para la respuesta al sismo en Colombia: verificación de información, acopio, logística y apoyo en refugios. Iniciativa ciudadana, independiente y no gubernamental.",
  path: "/voluntario",
});

const PATHS = [
  {
    icon: Laptop,
    title: "Voluntariado digital",
    body: "Verificación de información, cruce de datos, conexión entre quien ofrece y quien necesita ayuda, y difusión verificada. Sin requisito técnico previo.",
  },
  {
    icon: HardHat,
    title: "Voluntariado en terreno",
    body: "Acopio, logística, apoyo en refugios y primeros auxilios psicológicos básicos. Requiere registro y, según el rol, capacitación breve.",
  },
];

export default function VoluntarioPage() {
  return (
    <SubPageShell breadcrumb="Voluntario" path="/voluntario">
      <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <header className="mb-6">
          <h1 className="mb-2 text-[22px] font-bold text-slate-900 sm:text-2xl">
            Súmate como voluntario
          </h1>
          <p className="text-sm text-slate-600 sm:text-[15px]">
            Mallanet está organizando la respuesta ciudadana al sismo en
            Colombia. Hay dos caminos para ayudar; el registro toma un par de
            minutos y una sola acción: diligenciar este formulario.
          </p>
        </header>

        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PATHS.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="e-card rounded-[20px] bg-white p-5"
            >
              <Icon
                className="mb-3 h-6 w-6 text-[var(--brand-blue)]"
                aria-hidden
              />
              <h2 className="mb-1 text-base font-bold text-slate-900">
                {title}
              </h2>
              <p className="text-sm text-slate-600">{body}</p>
            </article>
          ))}
        </div>

        <div className="e-card rounded-[24px] bg-white p-6 sm:p-10">
          <h2 className="mb-2 text-lg font-bold text-slate-900">
            Formulario de registro
          </h2>
          <p className="mb-8 text-sm text-slate-600 sm:text-[15px]">
            Completar el registro no implica una asignación inmediata: nos
            permite ubicarte cuando tu perfil encaje con una necesidad.
          </p>

          <VolunteerForm />
          <div className="mt-8">
            <VolunteerPostSubmitBanner />
          </div>
        </div>
      </section>
    </SubPageShell>
  );
}
