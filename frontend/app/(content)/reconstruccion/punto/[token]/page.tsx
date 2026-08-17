import type { Metadata } from "next";
import SubPageShell from "@/components/layout/SubPageShell";
import StewardView from "@/components/features/campaign/StewardView";

// Sin indexar: cada URL lleva el token privado del punto.
export const metadata: Metadata = {
  title: "Tu punto de recolección",
  robots: { index: false, follow: false },
};

export default async function PuntoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <SubPageShell breadcrumb="Tu punto" path="/reconstruccion">
      <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <StewardView token={token} />
      </section>
    </SubPageShell>
  );
}
