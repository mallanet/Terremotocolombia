"use client";

/**
 * Orquestación del contexto Family Search (U11/U15) — mismo rol que
 * `patient-imports-admin.tsx` para su contexto: dueño del estado de vista
 * (cola vs. ficha) + pestaña activa (cola de vínculos vs. señales), y
 * anfitrión de la búsqueda persistente de página.
 *
 * Preservación del scroll de la cola (requisito explícito del plan de U11): `
 * <ReviewQueue>` se monta SIEMPRE, en la MISMA posición del árbol, MIENTRAS
 * la pestaña activa sea "queue" — abrir una ficha solo cambia el `className`
 * del contenedor que la envuelve (ancho completo → columna angosta) para
 * hacerle sitio al panel lateral. React reconcilia el MISMO nodo de columna
 * (mismo tipo de componente, misma posición entre hermanos, sin `key` que
 * cambie), así que su contenedor interno `overflow-y-auto` nunca se
 * desmonta y el navegador conserva su `scrollTop` solo.
 *
 * U15 añade una SEGUNDA pestaña ("Señales") como sección hermana, NO como
 * `className` oculto sobre el mismo árbol: a diferencia de la ficha
 * (panel lateral que convive con la cola), cambiar de pestaña SÍ desmonta la
 * pestaña anterior a propósito — `MatchCard` (dentro de `ReviewQueue`) y
 * `SignalCard` (dentro de `SignalQueue`) instalan CADA UNO su propio listener
 * global de teclado (1/2/3 y 1/2 respectivamente); si ambos quedaran
 * montados a la vez con solo CSS ocultando uno, un "1" en la pestaña
 * "Señales" también armaría/dispararía la tarjeta de vínculos oculta detrás.
 * El precio es perder el scroll de la cola de vínculos al volver de
 * "Señales" — aceptable (cambiar de pestaña es una acción deliberada, a
 * diferencia de abrir una ficha) y documentado aquí como la deviation.
 */
import { useState } from "react";
import { ClusterFicha } from "./cluster-ficha";
import { ReviewQueue } from "./review-queue";
import { SearchPanel } from "./search-panel";
import { SignalQueue } from "./signal-queue";
import type { FichaTarget } from "./types";

type View = { type: "queue"; highlightLinkId?: string } | { type: "ficha"; target: FichaTarget };
type Tab = "queue" | "signals";

export function FamilySearchAdmin() {
  const [tab, setTab] = useState<Tab>("queue");
  const [view, setView] = useState<View>({ type: "queue" });

  function openFicha(target: FichaTarget) {
    // Una ficha SIEMPRE vive dentro de la pestaña "queue" (es el panel
    // lateral de la cola de vínculos, ver docstring arriba) — abrirla desde
    // "Señales" (vía el link "Ver ficha" de un registro clusterizado)
    // también cambia de pestaña.
    setTab("queue");
    setView({ type: "ficha", target });
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Búsqueda de familias</h1>
        <p className="mt-1 text-sm text-gray-500">
          Cola de revisión de coincidencias, señales de estado de socios y ficha de identidad
          (PRN/cluster).
        </p>
      </div>

      <SearchPanel onOpenFicha={openFicha} />

      <div className="flex gap-2 border-b" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "queue"}
          className={`px-3 py-2 text-sm font-medium ${
            tab === "queue" ? "border-b-2 border-gray-900 text-gray-900" : "text-gray-500"
          }`}
          onClick={() => setTab("queue")}
        >
          Cola de revisión
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "signals"}
          className={`px-3 py-2 text-sm font-medium ${
            tab === "signals" ? "border-b-2 border-gray-900 text-gray-900" : "text-gray-500"
          }`}
          onClick={() => setTab("signals")}
        >
          Señales
        </button>
      </div>

      {tab === "queue" && (
        <div className={view.type === "ficha" ? "flex flex-col gap-4 lg:flex-row lg:items-start" : ""}>
          <div className={view.type === "ficha" ? "w-full lg:max-w-md lg:shrink-0" : "w-full"}>
            <h2 className="mb-2 text-lg font-semibold">Cola de revisión</h2>
            <ReviewQueue
              onOpenFicha={openFicha}
              highlightLinkId={view.type === "queue" ? view.highlightLinkId : undefined}
            />
          </div>

          {view.type === "ficha" && (
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Ficha</h2>
                <button
                  type="button"
                  className="text-sm text-gray-500 hover:underline"
                  onClick={() => setView({ type: "queue" })}
                >
                  Cerrar y volver a la cola
                </button>
              </div>
              <ClusterFicha
                target={view.target}
                onJumpToQueue={(linkId) => setView({ type: "queue", highlightLinkId: linkId })}
                onOpenSignals={() => setTab("signals")}
              />
            </div>
          )}
        </div>
      )}

      {tab === "signals" && (
        <div className="w-full">
          <h2 className="mb-2 text-lg font-semibold">Señales</h2>
          <SignalQueue onOpenFicha={openFicha} />
        </div>
      )}
    </div>
  );
}
