import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import SubPageShell from "@/components/layout/SubPageShell";
import EmergencyContacts from "@/components/features/contacts/EmergencyContacts";

export const metadata: Metadata = pageMetadata({
  title: "Teléfonos de emergencia",
  description:
    "Directorio actualizado de teléfonos para emergencias, salud, rescate y servicios públicos durante el terremoto.",
  path: "/telefonos",
});

export default function TelefonosPage() {
  return (
    <SubPageShell breadcrumb="Teléfonos de emergencia">
      <EmergencyContacts />
    </SubPageShell>
  );
}
