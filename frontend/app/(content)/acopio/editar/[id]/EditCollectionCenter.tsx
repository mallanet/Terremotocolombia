"use client";

import { useSearchParams } from "next/navigation";
import CollectionCenterForm from "@/components/features/collection/CollectionCenterForm";
import { getAcopioEditToken } from "@/lib/acopio-edit-store";

export default function EditCollectionCenter({ reportId }: { reportId: string }) {
  const search = useSearchParams();
  const token = search.get("token") || getAcopioEditToken(reportId) || "";
  if (!token) {
    return (
      <p className="e-inner e-m-rg-meta">
        Necesitas el enlace de edición que recibiste al registrar este punto.
      </p>
    );
  }
  return (
    <CollectionCenterForm mode={{ kind: "edit", reportId, token }} />
  );
}
