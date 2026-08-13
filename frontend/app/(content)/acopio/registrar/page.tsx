import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import SubPageShell from "@/components/layout/SubPageShell";
import CollectionCenterForm from "@/components/features/collection/CollectionCenterForm";

export const metadata: Metadata = pageMetadata({
  title: "Registrar un centro de acopio",
  description:
    "Publica un punto de acopio o refugio para que otras personas sepan dónde llevar donaciones.",
  path: "/acopio/registrar",
});

export default function RegistrarAcopioPage() {
  return (
    <SubPageShell breadcrumb="Registrar punto" path="/acopio/registrar">
      <CollectionCenterForm mode={{ kind: "create" }} />
    </SubPageShell>
  );
}
