"use client";

/**
 * Orquestación del contexto Family Search (U11) — mismo rol que
 * `patient-imports-admin.tsx` para su contexto: dueño del estado de vista
 * (cola vs. ficha) y anfitrión de la búsqueda persistente de página.
 *
 * Preservación del scroll de la cola (requisito explícito del plan): `
 * <ReviewQueue>` se monta SIEMPRE, en la MISMA posición del árbol — abrir una
 * ficha solo cambia el `className` del contenedor que la envuelve (ancho
 * completo → columna angosta) para hacerle sitio al panel lateral. React
 * reconcilia el MISMO nodo de columna (mismo tipo de componente, misma
 * posición entre hermanos, sin `key` que cambie), así que su contenedor
 * interno `overflow-y-auto` nunca se desmonta y el navegador conserva su
 * `scrollTop` solo. No hace falta guardar/restaurar el scroll a mano.
 */
import { useState } from "react";
import { ClusterFicha } from "./cluster-ficha";
import { ReviewQueue } from "./review-queue";
import { SearchPanel } from "./search-panel";
import type { FichaTarget } from "./types";

type View = { type: "queue"; highlightLinkId?: string } | { type: "ficha"; target: FichaTarget };

export function FamilySearchAdmin() {
  const [view, setView] = useState<View>({ type: "queue" });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Búsqueda de familias</h1>
        <p className="mt-1 text-sm text-gray-500">
          Cola de revisión de coincidencias y ficha de identidad (PRN/cluster).
        </p>
      </div>

      <SearchPanel onOpenFicha={(target) => setView({ type: "ficha", target })} />

      <div className={view.type === "ficha" ? "flex flex-col gap-4 lg:flex-row lg:items-start" : ""}>
        <div className={view.type === "ficha" ? "w-full lg:max-w-md lg:shrink-0" : "w-full"}>
          <h2 className="mb-2 text-lg font-semibold">Cola de revisión</h2>
          <ReviewQueue
            onOpenFicha={(target) => setView({ type: "ficha", target })}
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
            />
          </div>
        )}
      </div>
    </div>
  );
}
