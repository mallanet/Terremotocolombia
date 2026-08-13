"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  type MissingReportType,
  type MissingPersonPayload,
} from "@/components/features/missing/MissingPersonForm";
import { TabNav, type TabDef } from "@/components/ui/TabNav";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCreateMissing } from "@/hooks/missing";
import { useCreatePet } from "@/hooks/pets";
import type { PetPayload } from "@/components/features/pets/types";
import { PersonsTab, type PersonsTabHandle } from "./PersonsTab";
import { PetsTab, type PetsTabHandle } from "./PetsTab";
import { HospitalsTab } from "./HospitalsTab";

// Forms de reporte: code-split (pesados, solo al pulsar "Reportar").
const MissingPersonForm = dynamic(
  () => import("@/components/features/missing/MissingPersonForm"),
  { ssr: false },
);
const PetForm = dynamic(() => import("@/components/features/pets/PetForm"), {
  ssr: false,
});

type DirectoryTab = "personas" | "mascotas" | "hospitales";

const TABS: ReadonlyArray<TabDef<DirectoryTab>> = [
  {
    id: "personas",
    label: "Personas",
    tabId: "tab-personas",
    panelId: "panel-personas",
  },
  {
    id: "mascotas",
    label: "Mascotas",
    tabId: "tab-mascotas",
    panelId: "panel-mascotas",
  },
  {
    id: "hospitales",
    label: "Hospitales",
    tabId: "tab-hospitales",
    panelId: "panel-hospitales",
  },
];

function tabFromHash(hash: string): DirectoryTab | null {
  const id = hash.replace("#", "");
  if (id === "hospitales") return "hospitales";
  if (id === "mascotas" || id === "perdidas") return "mascotas";
  if (
    id === "personas" ||
    id === "desaparecidas" ||
    id === "desaparecidas-preview" ||
    id === "e-directory" ||
    id === "localizados"
  ) {
    return "personas";
  }
  return null;
}

function hashForTab(tab: DirectoryTab): string {
  if (tab === "hospitales") return "#hospitales";
  if (tab === "mascotas") return "#mascotas";
  return "#e-directory";
}

/**
 * Contenedor del directorio (personas + hospitales). Orquesta: pestañas
 * (TabNav), botones de reporte, el form (code-split) y el sync con el hash de
 * la URL. Los DATOS viven en cada pestaña vía hooks TanStack. UI verbatim del
 * MissingPersonsCarousel original.
 */
export default function MissingCarousel() {
  const [activeTab, setActiveTab] = useState<DirectoryTab>("personas");
  const [showForm, setShowForm] = useState(false);
  const [showPetForm, setShowPetForm] = useState(false);
  const [formReportType, setFormReportType] =
    useState<MissingReportType>("missing");
  const [formSessionKey, setFormSessionKey] = useState(0);
  const personasRef = useRef<PersonsTabHandle>(null);
  const mascotasRef = useRef<PetsTabHandle>(null);
  const createMissing = useCreateMissing();
  const createPet = useCreatePet();

  const selectTab = useCallback((tab: DirectoryTab) => {
    setActiveTab(tab);
    window.history.replaceState(null, "", hashForTab(tab));
  }, []);

  const openReportForm = useCallback((reportType: MissingReportType) => {
    setFormReportType(reportType);
    setFormSessionKey((k) => k + 1);
    setShowForm(true);
  }, []);

  const handleFormSubmit = useCallback(
    async (payload: MissingPersonPayload) => {
      await createMissing.mutateAsync(payload);
      setShowForm(false);
      personasRef.current?.refresh();
    },
    [createMissing],
  );

  const openPetForm = useCallback((reportType: MissingReportType) => {
    setFormReportType(reportType);
    setFormSessionKey((k) => k + 1);
    setShowPetForm(true);
  }, []);

  const handlePetFormSubmit = useCallback(
    async (payload: PetPayload) => {
      await createPet.mutateAsync(payload);
      setShowPetForm(false);
      // Publicar una mascota lleva a su pestaña: si el reporte no aparece a la
      // vista, la gente lo reenvía creyendo que no se guardó.
      setActiveTab("mascotas");
      mascotasRef.current?.refresh();
    },
    [createPet],
  );

  useEffect(() => {
    const syncFromHash = () => {
      const next = tabFromHash(window.location.hash);
      if (next) setActiveTab(next);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  // `relative` en la sección es imprescindible: los <span> ancla de abajo son
  // `absolute -top-24` y sin un ancestro posicionado se resuelven contra el
  // documento, o sea quedan en el TOPE de la página — navegar a #mascotas u
  // #hospitales scrolleaba arriba del todo en vez de al directorio. Va como
  // clase de ESTA sección (no en la regla compartida .e-m-section) para no
  // tocar el layout del resto del sitio.
  return (
    <section id="e-directory" className="relative scroll-mt-20 px-5 py-[clamp(48px,5vw,72px)]">
      <span
        id="hospitales"
        className="pointer-events-none absolute -top-24"
        aria-hidden
      />
      <span
        id="desaparecidas-preview"
        className="pointer-events-none absolute -top-24"
        aria-hidden
      />
      <span
        id="mascotas"
        className="pointer-events-none absolute -top-24"
        aria-hidden
      />
      <div className="mx-auto w-full max-w-[1120px]">
        <header className="mb-[clamp(28px,2rem+1vw,44px)] max-w-[720px]">
          <span className="mb-2.5 block font-heading text-[13px] font-extrabold tracking-[0.14em] text-primary uppercase">
            Directorio humanitario
          </span>
          <h2 className="font-heading text-3xl font-extrabold tracking-tight text-balance text-foreground sm:text-4xl">
            Personas, mascotas y hospitales
          </h2>
          <Separator className="mt-3.5 h-[3px] w-[72px] rounded-full bg-secondary" />
          <p className="mt-3 max-w-[58ch] text-base leading-relaxed text-muted-foreground sm:text-lg">
            Consulta reportes de personas desaparecidas, localizadas, mascotas
            perdidas y registros hospitalarios.
          </p>
        </header>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <TabNav
            tabs={TABS}
            active={activeTab}
            onSelect={selectTab}
            ariaLabel="Directorio de personas y hospitales"
          />
          {/* El botón sigue a la pestaña activa: en "Mascotas" ofrecer "Reportar
              persona" haría que la gente publicara a su perro como persona
              desaparecida, que es exactamente lo que esta feature evita. */}
          {activeTab === "mascotas" ? (
            <Button
              type="button"
              onClick={() => openPetForm("missing")}
              className="shrink-0 bg-destructive font-semibold text-white hover:bg-destructive/85 max-sm:w-full"
            >
              Reportar mascota
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => openReportForm("missing")}
              className="shrink-0 bg-destructive font-semibold text-white hover:bg-destructive/85 max-sm:w-full"
            >
              Reportar persona
            </Button>
          )}
        </div>

        {activeTab === "personas" && (
          <div
            role="tabpanel"
            id="panel-personas"
            aria-labelledby="tab-personas"
            className="pt-2"
          >
            <PersonsTab ref={personasRef} />
          </div>
        )}
        {activeTab === "mascotas" && (
          <div
            role="tabpanel"
            id="panel-mascotas"
            aria-labelledby="tab-mascotas"
            className="pt-2"
          >
            <PetsTab ref={mascotasRef} />
          </div>
        )}
        {activeTab === "hospitales" && (
          <div
            role="tabpanel"
            id="panel-hospitales"
            aria-labelledby="tab-hospitales"
            className="pt-2"
          >
            <HospitalsTab />
          </div>
        )}

        {showForm && (
          <MissingPersonForm
            key={`${formReportType}-${formSessionKey}`}
            initialReportType={formReportType}
            initialFoundPlace={null}
            onCancel={() => setShowForm(false)}
            onSubmit={handleFormSubmit}
          />
        )}

        {showPetForm && (
          <PetForm
            key={`pet-${formReportType}-${formSessionKey}`}
            initialReportType={formReportType}
            onCancel={() => setShowPetForm(false)}
            onSubmit={handlePetFormSubmit}
          />
        )}
      </div>
    </section>
  );
}
