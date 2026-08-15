"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { acopioReportId, getAcopioEditToken } from "@/lib/acopio-edit-store";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

export default function CollectionCenterEditLink({
  centerId,
}: {
  centerId: string;
}) {
  const reportId = acopioReportId(centerId);
  const token = useSyncExternalStore(
    subscribe,
    () => (reportId ? getAcopioEditToken(reportId) : null),
    () => null,
  );
  if (!reportId || !token) return null;
  return (
    <p className="mt-3">
      <Link
        href={`/acopio/editar/${reportId}?token=${encodeURIComponent(token)}`}
        className="e-m-link"
      >
        Editar este punto
      </Link>
    </p>
  );
}
