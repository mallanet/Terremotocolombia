import type { Metadata } from "next";
import { Shell } from "../shell";
import { RequireCapability } from "@/src/shared/auth/admin-gate";
import { VolunteerAnalyticsBoard } from "@/src/contexts/volunteer-analytics/volunteer-analytics-board";

export const metadata: Metadata = { robots: { index: false } };

export default function Page() {
  return (
    <Shell>
      <RequireCapability
        cap="volunteer:read"
        fallback={
          <p className="text-sm text-red-600">No tienes permiso (volunteer:read).</p>
        }
      >
        <VolunteerAnalyticsBoard />
      </RequireCapability>
    </Shell>
  );
}
