import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import SubPageShell from "@/components/layout/SubPageShell";
import CheckinForm from "@/components/features/voluntariado/CheckinForm";

export const metadata: Metadata = pageMetadata({
  title: "Check-in de voluntario",
  description:
    "Registra tu actividad como voluntario con tu código único: dónde estuviste, qué dejaste o recogiste y una foto de evidencia.",
  path: "/checkin",
});

export default function CheckinPage() {
  return (
    <SubPageShell breadcrumb="Check-in" path="/checkin">
      <section className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
        <header className="mb-6">
          <h1 className="mb-2 text-[22px] font-bold text-slate-900 sm:text-2xl">
            Check-in de voluntario
          </h1>
          <p className="text-sm text-slate-600 sm:text-[15px]">
            Si llegaste a un centro de acopio, refugio o punto de entrega,
            regístralo aquí con tu código de voluntario. Así sabemos quién
            estuvo dónde y qué dejó — y podemos verificarlo con tu foto.
          </p>
        </header>

        <div className="e-card rounded-[24px] bg-white p-6 sm:p-10">
          <CheckinForm />
        </div>
      </section>
    </SubPageShell>
  );
}
