import type { Metadata } from "next";
import { Shell } from "../shell";
import { RequireCapability } from "@/src/shared/auth/admin-gate";
import { FamilySearchAdmin } from "@/src/contexts/family-search/family-search-admin";

export const metadata: Metadata = {
  title: "Búsqueda de familias — Panel de administración",
  robots: { index: false },
};

export default function Page() {
  return (
    <Shell>
      <RequireCapability
        cap="person:search"
        fallback={<p className="text-sm text-red-600">No tienes permiso (person:search).</p>}
      >
        <FamilySearchAdmin />
      </RequireCapability>
    </Shell>
  );
}
