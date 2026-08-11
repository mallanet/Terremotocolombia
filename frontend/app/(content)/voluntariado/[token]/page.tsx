import type { Metadata } from "next";
import SubPageShell from "@/components/layout/SubPageShell";
import AssignmentView from "@/components/features/voluntariado/AssignmentView";

// Sin indexar: cada URL lleva el token personal de la asignación.
export const metadata: Metadata = {
  title: "Tu asignación de voluntariado",
  robots: { index: false, follow: false },
};

export default async function VoluntariadoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <SubPageShell breadcrumb="Tu asignación" path="/voluntariado">
      <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <header className="mb-6">
          <h1 className="mb-2 text-[22px] font-bold text-slate-900 sm:text-2xl">
            Tu asignación
          </h1>
          <p className="text-sm text-slate-600 sm:text-[15px]">
            Aquí ves los puntos exactos del traslado y respondes a la tarea que
            el equipo te asignó.
          </p>
        </header>
        <AssignmentView token={token} />
      </section>
    </SubPageShell>
  );
}
