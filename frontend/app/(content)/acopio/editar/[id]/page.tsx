import type { Metadata } from "next";
import { Suspense } from "react";
import { pageMetadata } from "@/lib/metadata";
import SubPageShell from "@/components/layout/SubPageShell";
import EditCollectionCenter from "./EditCollectionCenter";

export const metadata: Metadata = pageMetadata({
  title: "Editar centro de acopio",
  description: "Actualiza un punto de acopio que registraste.",
  path: "/acopio/editar",
});

export default async function EditarAcopioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <SubPageShell breadcrumb="Editar punto" path={`/acopio/editar/${id}`}>
      <Suspense fallback={<p className="e-inner">Cargando…</p>}>
        <EditCollectionCenter reportId={id} />
      </Suspense>
    </SubPageShell>
  );
}
