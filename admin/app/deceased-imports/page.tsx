import type { Metadata } from "next";
import { Shell } from "../shell";
import { RequireCapability } from "@/src/shared/auth/admin-gate";
import { DeceasedImportsAdmin } from "@/src/contexts/deceased-imports/deceased-imports-admin";

export const metadata: Metadata = { robots: { index: false } };

export default function Page() {
  return (
    <Shell>
      <RequireCapability
        cap="missing:create"
        fallback={<p className="text-sm text-red-600">No tienes permiso (missing:create).</p>}
      >
        <DeceasedImportsAdmin />
      </RequireCapability>
    </Shell>
  );
}
