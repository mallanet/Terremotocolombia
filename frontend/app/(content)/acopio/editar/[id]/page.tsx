import type { Metadata } from "next";
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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;
  return (
    <SubPageShell breadcrumb="Editar punto" path={`/acopio/editar/${id}`}>
      <EditCollectionCenter reportId={id} tokenFromUrl={token ?? ""} />
    </SubPageShell>
  );
}
