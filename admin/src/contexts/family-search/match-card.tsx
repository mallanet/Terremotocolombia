"use client";

/**
 * Tarjeta de comparación lado-a-lado de UNA propuesta de vínculo (R12,
 * centerpiece de U11). Registro A/B + coloreado por campo + score/evidencia/
 * matcher version + banner de re-propuesta + 3 acciones keyboard-first
 * (1/2/3 arman la decisión, Enter la confirma — el throughput de la cola
 * durante un surge es una propiedad de seguridad, ver plan U11).
 *
 * Usa `useDecisionMutation` (compartido con U5, NO reinventado): pending
 * deshabilita, 409 real → "decidida por otra persona" + avanza, cualquier
 * OTRO error → inline reintentable. El 403 de escalación de fusión anclada
 * (R18) es la única excepción: se intercepta ANTES de mostrarse como error
 * genérico y abre `EscalationModal` en su lugar (ver ese archivo para por
 * qué solo puede aparecer después del intento).
 */
import { useEffect, useRef, useState } from "react";
import { RequireCapability } from "@/src/shared/auth/admin-gate";
import { useAdminSessionContext } from "@/src/shared/auth/admin-session-context";
import { Button } from "@/src/ui";
import {
  DecisionRequestError,
  useDecisionMutation,
} from "@/src/shared/mutation/use-decision-mutation";
import { postDecision, queueQueryKey } from "./api";
import { EscalationModal } from "./escalation-modal";
import { EvidenceChips, RecordSummary } from "./record-summary";
import {
  evidenceClassFromSnapshot,
  evidenceClassLabel,
  type DecisionResponse,
  type LinkDecisionValue,
  type QueueItemDTO,
} from "./types";

/** Texto distintivo de `AnchoredMergeEscalationError` (person-links.ts) — el
 *  `.code` del error NO se serializa hoy (ver docstring de esa clase), así
 *  que el cliente distingue por el mensaje. Coincide con una subcadena
 *  estable ("fusión anclada") en vez del texto completo, para no acoplarse a
 *  redacciones menores. */
function isAnchoredMergeEscalation(error: Error | null): boolean {
  return (
    error instanceof DecisionRequestError &&
    error.status === 403 &&
    /fusión anclada/i.test(error.message)
  );
}

const ACTIONS: { key: "1" | "2" | "3"; decision: LinkDecisionValue; label: string }[] = [
  { key: "1", decision: "confirmar", label: "Confirmar coincidencia" },
  { key: "2", decision: "rechazar", label: "No es la misma persona" },
  { key: "3", decision: "inseguro", label: "No estoy seguro" },
];

const CONFLICT_ADVANCE_DELAY_MS = 900;

export function MatchCard({
  item,
  onAdvance,
}: {
  item: QueueItemDTO;
  /** Avanza a la siguiente propuesta de la cola — se llama tras éxito
   *  (incluye replay idempotente, que SIEMPRE se trata como éxito) y tras un
   *  409 real (con un respiro visible antes, ver CONFLICT_ADVANCE_DELAY_MS). */
  onAdvance: () => void;
}) {
  const { can } = useAdminSessionContext();
  const canReview = can("person:review");

  const [selected, setSelected] = useState<LinkDecisionValue | null>(null);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState(false);
  const [showEscalation, setShowEscalation] = useState(false);
  const conflictTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteRef = useRef<HTMLTextAreaElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Keyboard-first: al armar "3" (nota obligatoria) el foco salta a la nota
  // directamente, sin que el revisor tenga que alcanzar el mouse.
  useEffect(() => {
    if (selected === "inseguro") noteRef.current?.focus();
  }, [selected]);

  const decision = useDecisionMutation<{ decision: LinkDecisionValue; note?: string }, DecisionResponse>({
    mutationFn: (vars) => postDecision(item.link.id, vars),
    invalidateKeys: [queueQueryKey()],
    onSuccess: () => {
      // Replay idempotente (200, misma decisión del mismo revisor) SIEMPRE
      // se trata como éxito — el contrato lo pide explícito (ver plan U11).
      setShowEscalation(false);
      onAdvance();
    },
  });

  // Escalación de fusión anclada: se intercepta el error ANTES de que caiga
  // en el banner genérico de "cualquier otro error" — abre el modal y limpia
  // el error de la mutación (el modal es ahora la superficie de esa
  // respuesta, no queremos los dos a la vez).
  useEffect(() => {
    if (isAnchoredMergeEscalation(decision.error)) {
      setShowEscalation(true);
      decision.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decision.error]);

  // 409 real: se muestra el aviso un momento y LUEGO se avanza — el
  // throughput de la cola es una propiedad de seguridad (plan U11), pero un
  // avance instantáneo sin feedback sería desorientador en medio de un surge.
  useEffect(() => {
    if (!decision.isConflict) return;
    conflictTimerRef.current = setTimeout(onAdvance, CONFLICT_ADVANCE_DELAY_MS);
    return () => {
      if (conflictTimerRef.current) clearTimeout(conflictTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decision.isConflict]);

  function commit(decisionOverride?: LinkDecisionValue) {
    const target = decisionOverride ?? selected;
    if (!target || decision.isPending) return;
    if (target === "inseguro" && note.trim().length === 0) {
      setNoteError(true);
      return;
    }
    setNoteError(false);
    // La nota SOLO tiene sentido (y solo se muestra un textarea) para
    // 'inseguro' — nunca se manda para confirmar/rechazar, ni siquiera si
    // quedó texto sin limpiar de una selección anterior a "3" (evita que una
    // nota de "no estoy seguro" quede pegada por accidente a una decisión
    // distinta).
    decision.mutate({ decision: target, note: target === "inseguro" ? note.trim() : undefined });
  }

  /** Cambia la acción armada; si se aleja de "inseguro" limpia la nota (para
   *  que, si el revisor vuelve a "3" más tarde, no reaparezca texto de un
   *  intento anterior). La corrección de fondo contra fugas vive en
   *  `commit()` arriba — esto es solo higiene de UI. */
  function selectAction(next: LinkDecisionValue) {
    setNoteError(false);
    if (selected !== "inseguro" || next !== "inseguro") {
      setNote("");
    }
    setSelected(next);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Guard de scope: el listener es global (window), pero SearchPanel se
      // monta siempre por encima de esta tarjeta (family-search-admin.tsx) —
      // sin esto, un Enter en el buscador comete la decisión armada de la
      // tarjeta de FONDO y además le hace preventDefault al submit del
      // buscador. Solo se procesa el evento si no vino de ningún foco
      // específico (target === document.body, el caso "nada enfocado") o si
      // vino de dentro de esta tarjeta.
      const target = event.target as HTMLElement | null;
      // `instanceof Node` además de null-check: un evento sintético puede traer
      // window (u otro no-Node) como target, y `contains()` lanza sobre eso.
      const inScope =
        target === document.body || (target instanceof Node && containerRef.current?.contains(target));
      if (!inScope) return;
      if (decision.isPending || showEscalation || !canReview || decision.isConflict) return;
      const isTextField = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");

      if (event.key === "Enter") {
        if (isTextField && event.shiftKey) return; // permite salto de línea en la nota
        event.preventDefault();
        commit();
        return;
      }
      if (isTextField) return; // 1/2/3 no deben interceptar la escritura en la nota
      const action = ACTIONS.find((a) => a.key === event.key);
      if (action) {
        event.preventDefault();
        selectAction(action.decision);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, note, decision.isPending, showEscalation, canReview, decision.isConflict]);

  if (decision.isConflict) {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-6 text-center"
      >
        <p className="font-medium text-amber-800">
          Esta propuesta ya fue decidida por otra persona.
        </p>
        <p className="text-sm text-amber-700">Pasando a la siguiente propuesta…</p>
      </div>
    );
  }

  const priorEvidenceClass = evidenceClassFromSnapshot(item.priorRejection?.evidenceSnapshot);

  return (
    <div ref={containerRef} data-testid="match-card" className="flex flex-col gap-4 rounded-lg border p-4">
      {item.priorRejection && (
        <div role="note" className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Rechazado antes ({item.priorRejection.decision === "rescinded" ? "fusión deshecha" : "rechazado"})
          {" "}— nueva evidencia: {evidenceClassLabel(item.link.evidenceClass)}
          {priorEvidenceClass ? ` (antes: ${evidenceClassLabel(priorEvidenceClass)})` : ""}.
          {item.priorRejection.note && <span> Nota anterior: "{item.priorRejection.note}"</span>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded border p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Registro A</p>
          <RecordSummary record={item.a} label="Registro A" />
        </div>
        <div className="rounded border p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Registro B</p>
          <RecordSummary record={item.b} label="Registro B" />
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded border bg-gray-50 p-3 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span>
            <strong>Score:</strong> {item.link.score !== null ? item.link.score.toFixed(2) : "—"}
          </span>
          <span>
            <strong>Clase:</strong> {evidenceClassLabel(item.link.evidenceClass)}
          </span>
          <span>
            <strong>Matcher:</strong> {item.link.matcherVersion ?? "—"} ({item.link.method})
          </span>
        </div>
        <EvidenceChips evidence={item.link.evidence} />
      </div>

      {decision.error && (
        <p role="alert" className="text-sm text-red-600">
          {decision.error.message}
        </p>
      )}

      <RequireCapability
        cap="person:review"
        fallback={
          <p className="text-sm text-gray-500">
            No tienes permiso para decidir vínculos (person:review) — solo lectura.
          </p>
        }
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {ACTIONS.map((action) => (
              <Button
                key={action.decision}
                type="button"
                variant={selected === action.decision ? "primary" : "ghost"}
                disabled={decision.isPending}
                onClick={() => {
                  selectAction(action.decision);
                  if (action.decision !== "inseguro") commit(action.decision);
                }}
              >
                {action.key} · {action.label}
              </Button>
            ))}
          </div>

          {selected === "inseguro" && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" htmlFor="match-card-note">
                Nota (obligatoria)
              </label>
              <textarea
                id="match-card-note"
                data-testid="match-card-note"
                ref={noteRef}
                className="min-h-16 rounded border p-2 text-sm"
                value={note}
                onChange={(event) => {
                  setNote(event.target.value);
                  if (event.target.value.trim().length > 0) setNoteError(false);
                }}
                placeholder="¿Por qué no estás seguro?"
              />
              {noteError && (
                <p role="alert" className="text-xs text-red-600">
                  La nota es obligatoria para marcar un vínculo como inseguro.
                </p>
              )}
              <Button type="button" disabled={decision.isPending} onClick={() => commit("inseguro")}>
                {decision.isPending ? "Enviando…" : "Enviar decisión"}
              </Button>
            </div>
          )}

          <p className="text-xs text-gray-500">
            Atajos de teclado: 1 confirmar · 2 no es la misma · 3 no estoy seguro · Enter confirma
            la selección.
          </p>
        </div>
      </RequireCapability>

      {showEscalation && (
        <EscalationModal
          item={item}
          isPending={decision.isPending}
          onCancel={() => setShowEscalation(false)}
          // Mismo criterio que commit(): "confirmar" nunca lleva nota, ni
          // siquiera si quedó texto sin limpiar de un intento a "inseguro".
          onConfirm={() => decision.mutate({ decision: "confirmar", note: undefined })}
        />
      )}
    </div>
  );
}
