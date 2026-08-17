import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/metadata";
import SubPageShell from "@/components/layout/SubPageShell";
import CertificateCard from "@/components/features/campaign/CertificateCard";
import { serverApiGetOrNull } from "@/lib/server-api";
import type { CampaignCertificate } from "@/lib/campaign-materials";

// Sin indexar: la URL lleva el código de la donación, que es su credencial.
export const metadata: Metadata = {
  ...pageMetadata({
    title: "Certificado de donación",
    description:
      "Consulta y verifica un certificado de donación de materiales de la campaña de reconstrucción.",
    path: "/reconstruccion/certificado",
  }),
  robots: { index: false, follow: false },
};

export default async function CertificadoPage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = await params;
  const data = await serverApiGetOrNull<{ certificate: CampaignCertificate }>(
    `/api/campaign/certificado/${encodeURIComponent(codigo)}`,
  );

  if (!data) notFound();

  return (
    <SubPageShell breadcrumb="Certificado" path="/reconstruccion">
      <section className="mx-auto w-full max-w-[720px] px-4 py-8 sm:px-6">
        <CertificateCard certificate={data.certificate} />
      </section>
    </SubPageShell>
  );
}
