"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import CollectionCenterForm from "@/components/features/collection/CollectionCenterForm";
import { getAcopioEditToken } from "@/lib/acopio-edit-store";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

export default function EditCollectionCenter({
  reportId,
  tokenFromUrl,
}: {
  reportId: string;
  tokenFromUrl: string;
}) {
  const stored = useSyncExternalStore(
    subscribe,
    () => getAcopioEditToken(reportId) || "",
    () => "",
  );
  const token = tokenFromUrl || stored;
  if (!token) {
    return (
      <div className="e-inner space-y-3">
        <p className="e-m-rg-meta">
          Necesitas el enlace de edición que viste al registrar este punto. Si
          lo perdiste, registra el punto de nuevo.
        </p>
        <Link href="/acopio/registrar" className="e-m-btn e-m-btn--primary inline-flex">
          Registrar un punto
        </Link>
      </div>
    );
  }
  return (
    <CollectionCenterForm mode={{ kind: "edit", reportId, token }} />
  );
}
