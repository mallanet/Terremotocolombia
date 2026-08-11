"use client";

/**
 * Patrón compartido de "superficie de decisión": cualquier botón que dispara
 * UNA escritura contra el BFF y tiene que resolver siempre la misma pregunta —
 * ¿deshabilito mientras está en vuelo?, ¿qué hago si alguien más ya decidió
 * esto?, ¿qué hago con cualquier OTRO error? Nace en U5 (editor de filas de
 * import), pensado para que U11/U15 reusen el mismo hook en vez de reinventar
 * la regla en cada context.
 *
 * Contrato:
 *   - en vuelo (`isPending`)  → el caller desactiva su botón (sin doble submit;
 *     react-query ya deduplica, pero el UX de "deshabilitado" es explícito).
 *   - 409 (conflicto/decidido en otro lado) → `isConflict: true` y se dispara
 *     un refetch automático de `invalidateKeys` (trae la versión vigente); el
 *     caller solo tiene que mostrar el copy "modificada/decidida por otra
 *     persona" cuando `isConflict` es true.
 *   - cualquier OTRO error (red, 4xx≠409, 5xx) → `error` queda poblado, SIN
 *     refetch (el dato local sigue siendo válido) — el caller lo muestra como
 *     inline reintentable; `reset()` lo limpia si el usuario reintenta.
 */
import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { adminFetch, type FetchInit } from "@/src/shared/http/admin-fetch";

/** Error de una llamada al BFF con el status HTTP adjunto, para que los
 * callers distingan 409 de cualquier otro fallo sin parsear el mensaje. */
export class DecisionRequestError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "DecisionRequestError";
    this.status = status;
    this.body = body;
  }
}

export function jsonRequestInit(method: string, body?: unknown): FetchInit {
  return body === undefined
    ? { method }
    : { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

/** fetch al BFF same-origin que lanza `DecisionRequestError` (con status) en
 * vez del `Error` genérico sin status de `adminFetch` a pelo. */
export async function requestDecisionJson<T>(url: string, init?: FetchInit): Promise<T> {
  const response = await adminFetch(url, init);
  const body = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) {
    const message = (body as { error?: string } | null)?.error ?? `Error ${response.status}`;
    throw new DecisionRequestError(response.status, message, body);
  }
  return body as T;
}

export interface DecisionMutationState<TVars> {
  mutate(vars: TVars): void;
  mutateAsync(vars: TVars): Promise<void>;
  /** true mientras la mutación está en vuelo — desactivar el botón con esto. */
  isPending: boolean;
  /** true si el último intento chocó con un 409. El refetch ya se disparó. */
  isConflict: boolean;
  /** Cualquier OTRO error (no 409) — reintentable; null si no hay error. */
  error: Error | null;
  /** Limpia el error actual (p.ej. antes de reintentar). */
  reset(): void;
}

/**
 * Envuelve `useMutation` con la regla de negocio de arriba. Un hook por acción
 * (guardar, confirmar, rechazar, decidir dedupe…) — no comparte estado entre
 * botones distintos a propósito, así el error de uno no tapa el de otro.
 */
export function useDecisionMutation<TVars, TResult = unknown>(options: {
  mutationFn: (vars: TVars) => Promise<TResult>;
  /** Query keys a invalidar tras éxito, y también tras un 409 (para traer la
   * versión vigente que ganó la carrera). */
  invalidateKeys: QueryKey[];
  onSuccess?: (result: TResult, vars: TVars) => void;
  /** Error que NO es 409 (el 409 lo maneja el hook: invalida y expone
   *  `isConflict`). Para interceptar una respuesta especial ANTES de que
   *  caiga en el banner genérico — p.ej. la escalación de fusión anclada
   *  abre un modal y resetea la mutación aquí, en el callback, en vez de en
   *  un efecto (react-hooks/set-state-in-effect). */
  onError?: (error: Error) => void;
}): DecisionMutationState<TVars> {
  const queryClient = useQueryClient();

  const invalidate = () =>
    Promise.all(
      options.invalidateKeys.map((key) => queryClient.invalidateQueries({ queryKey: key })),
    );

  const mutation = useMutation({
    mutationFn: options.mutationFn,
    onSuccess: async (result, vars) => {
      await invalidate();
      options.onSuccess?.(result, vars);
    },
    onError: async (error) => {
      if (error instanceof DecisionRequestError && error.status === 409) {
        await invalidate();
        return;
      }
      options.onError?.(error as Error);
    },
  });

  const isConflict =
    mutation.error instanceof DecisionRequestError && mutation.error.status === 409;
  const error = mutation.error && !isConflict ? mutation.error : null;

  return {
    mutate: (vars: TVars) => mutation.mutate(vars),
    mutateAsync: async (vars: TVars) => {
      await mutation.mutateAsync(vars).catch(() => undefined);
    },
    isPending: mutation.isPending,
    isConflict,
    error,
    reset: () => mutation.reset(),
  };
}
