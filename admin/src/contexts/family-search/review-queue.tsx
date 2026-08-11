"use client";

/**
 * Vista por defecto (§1 del plan U11): la cola de revisión. `useInfiniteQuery`
 * con cursor keyset — mismo idioma que `app/audit/audit-admin.tsx`, adaptado
 * al cursor compuesto `"<proposedAt>_<id>"` de
 * `person-links.router.ts:parseCursor`. El orden (banda fuerte primero,
 * luego score) lo decide el backend (listQueue) — este componente NUNCA
 * reordena lo que recibe.
 *
 * Solo la PRIMERA propuesta cargada es interactiva (el match-card completo,
 * con atajos de teclado): decidir una propuesta la saca del filtro
 * status=proposed, así que la invalidación que dispara `useDecisionMutation`
 * (compartida, ver match-card.tsx) refresca la lista y la propuesta
 * decidida desaparece — la SIGUIENTE pasa a ser `items[0]` sola, sin
 * bookkeeping de índice en el cliente. El resto de la cola cargada se ve
 * como una vista previa compacta (con sus chips de evidencia) debajo,
 * para que el revisor vea qué viene — sin botones de acción (una sola
 * decisión en vuelo a la vez, a propósito).
 */
import { useInfiniteQuery } from "@tanstack/react-query";
import { Button } from "@/src/ui";
import { fetchQueuePage, queueQueryKey } from "./api";
import { MatchCard } from "./match-card";
import { EvidenceChips } from "./record-summary";
import { evidenceClassLabel, type FichaTarget, type QueueItemDTO, type QueueResponse } from "./types";

const PAGE_LIMIT = 25;

function cursorOf(item: QueueItemDTO): string {
  return `${item.link.proposedAt}_${item.link.id}`;
}

export function ReviewQueue({
  onOpenFicha,
  highlightLinkId,
}: {
  onOpenFicha: (target: FichaTarget) => void;
  /** Id de vínculo a resaltar (viene de "Ver en la cola" en la ficha —
   *  manual-link-search.tsx). Puramente visual, no cambia el orden. */
  highlightLinkId?: string;
}) {
  const query = useInfiniteQuery({
    queryKey: queueQueryKey(),
    queryFn: ({ pageParam }: { pageParam: string | null }) =>
      fetchQueuePage({ before: pageParam, limit: PAGE_LIMIT }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: QueueResponse) =>
      lastPage.items.length === PAGE_LIMIT ? cursorOf(lastPage.items[lastPage.items.length - 1]!) : undefined,
  });

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const [active, ...upcoming] = items;

  if (query.isLoading) {
    return <p className="text-sm text-gray-500">Cargando cola de revisión…</p>;
  }

  if (query.isError) {
    return (
      <p role="alert" className="text-sm text-red-600">
        {query.error instanceof Error ? query.error.message : "Error al cargar la cola."}
      </p>
    );
  }

  if (!active) {
    return (
      <div className="rounded border border-dashed p-8 text-center text-sm text-gray-500">
        No hay propuestas pendientes.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <MatchCard
        key={active.link.id}
        item={active}
        onAdvance={() => {
          /* La invalidación de useDecisionMutation ya refresca la cola —
           * items[0] cambia solo. No hace falta índice manual aquí. */
        }}
      />

      {highlightLinkId && !items.some((i) => i.link.id === highlightLinkId) && (
        <p className="text-xs text-gray-500">
          Buscando la propuesta reciente en la cola — puede tardar unos segundos en aparecer.
          Usa “Cargar más” si no aparece.
        </p>
      )}

      {upcoming.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Próximas en la cola ({upcoming.length} cargada{upcoming.length === 1 ? "" : "s"})
          </p>
          <ul className="flex flex-col gap-2">
            {upcoming.map((item) => (
              <li
                key={item.link.id}
                data-testid="queue-preview-item"
                className={`rounded border p-2 text-sm ${
                  highlightLinkId === item.link.id ? "ring-2 ring-blue-400" : ""
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    {item.a?.name || "(sin nombre)"} — {item.b?.name || "(sin nombre)"}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{evidenceClassLabel(item.link.evidenceClass)}</span>
                    {item.a && (
                      <button
                        type="button"
                        className="text-xs text-blue-700 hover:underline"
                        onClick={() =>
                          onOpenFicha(
                            item.a!.clusterId
                              ? { type: "cluster", clusterId: item.a!.clusterId }
                              : { type: "standalone", record: item.a! },
                          )
                        }
                      >
                        Ver ficha
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-1">
                  <EvidenceChips evidence={item.link.evidence} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {query.hasNextPage && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="ghost"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {query.isFetchingNextPage ? "Cargando…" : "Cargar más"}
          </Button>
        </div>
      )}
    </div>
  );
}
