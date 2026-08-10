"use client";

import dynamic from "next/dynamic";
import { SectionLoading } from "@/components/ui/SectionLoading";

const ResponseGridHub = dynamic(() => import("./ResponseGridHub"), {
  ssr: false,
  loading: () => (
    <SectionLoading label="Cargando hub ResponseGrid…" rows={3} />
  ),
});

export default ResponseGridHub;
