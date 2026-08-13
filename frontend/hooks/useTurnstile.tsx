"use client";

/**
 * Cloudflare Turnstile — patrón recomendado para SPA (render EXPLÍCITO + token
 * por-submit + reset). Prueba de humanidad: el widget genera un token de UN SOLO
 * USO (caduca a 300s) que el backend verifica en `requireHuman` (Siteverify).
 *
 * Uso en un formulario:
 *   const turnstile = useTurnstile();
 *   ...
 *   <div ref={turnstile.mountRef} />          // donde quieras el widget (managed/invisible)
 *   ...
 *   const token = await turnstile.getToken();   // en el submit, token FRESCO
 *   await mutate({ ...payload, turnstileToken: token });
 *
 * `getToken()`:
 *  - devuelve el token actual si ya existe, o espera al challenge si está pendiente;
 *  - tras leerlo, hace `reset()` para que el PRÓXIMO submit obtenga uno nuevo
 *    (los tokens son de un solo uso — sin reset, el 2º envío fallaría con 403).
 *  - sin SITE KEY (dev/local) devuelve "" → el backend tampoco exige Turnstile.
 *
 * SITE KEY público (NEXT_PUBLIC_*, se inlinea en build).
 */
import { useCallback, useEffect, useRef } from "react";

export const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export interface TurnstileAPI {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      theme?: "auto" | "light" | "dark";
      appearance?: "always" | "execute" | "interaction-only";
    },
  ) => string;
  getResponse: (id: string) => string | undefined;
  reset: (id: string) => void;
  remove: (id: string) => void;
}

/**
 * Turnstile invokes its success callback before it finishes updating the
 * widget. Resetting synchronously from that callback can make Turnstile render
 * "Nothing to reset found" inside the form. Defer the reset and ignore it when
 * React has already replaced the widget container.
 */
export function scheduleTurnstileReset(
  api: TurnstileAPI,
  id: string,
  isCurrent: () => boolean,
): ReturnType<typeof setTimeout> {
  return setTimeout(() => {
    if (!isCurrent()) return;
    api.reset(id);
  }, 0);
}
declare global {
  interface Window {
    turnstile?: TurnstileAPI;
  }
}

let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("No se pudo cargar Turnstile"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export interface UseTurnstile {
  /** Callback-ref: pásalo a un <div> donde montar el widget. Nombre != "ref"
   *  a propósito (el lint react-hooks/refs marca cualquier `.ref` en render). */
  mountRef: (el: HTMLDivElement | null) => void;
  /** Token FRESCO para este submit; resetea el widget tras leerlo. "" si no hay site key. */
  getToken: () => Promise<string>;
  /** True si Turnstile está activo (hay site key). */
  enabled: boolean;
}

export function useTurnstile(): UseTurnstile {
  const elRef = useRef<HTMLDivElement | null>(null);
  const widgetId = useRef<string | null>(null);
  const mountGeneration = useRef(0);
  const tokenRef = useRef<string>("");
  // Resolvers esperando un token mientras el challenge está pendiente.
  const waiters = useRef<((t: string) => void)[]>([]);

  const onToken = useCallback((token: string) => {
    tokenRef.current = token;
    const ws = waiters.current;
    waiters.current = [];
    ws.forEach((resolve) => resolve(token));
  }, []);

  const mount = useCallback(
    (el: HTMLDivElement | null) => {
      const generation = ++mountGeneration.current;
      elRef.current = el;
      if (!el) {
        const currentId = widgetId.current;
        widgetId.current = null;
        tokenRef.current = "";
        if (currentId && window.turnstile) {
          try {
            window.turnstile.remove(currentId);
          } catch {
            // The provider may already have removed a detached container.
          }
        }
        return;
      }
      if (!TURNSTILE_SITE_KEY) return;
      loadScript()
        .then(() => {
          if (
            mountGeneration.current !== generation ||
            elRef.current !== el ||
            !window.turnstile ||
            widgetId.current
          ) {
            return;
          }
          widgetId.current = window.turnstile.render(el, {
            sitekey: TURNSTILE_SITE_KEY,
            appearance: "interaction-only", // invisible salvo que CF pida reto
            theme: "auto",
            callback: onToken,
            "expired-callback": () => {
              tokenRef.current = "";
            },
            "error-callback": () => {
              tokenRef.current = "";
            },
          });
        })
        .catch(() => {
          /* si el script no carga, getToken() devuelve "" y el POST dará 403 */
        });
    },
    [onToken],
  );

  useEffect(() => {
    return () => {
      mountGeneration.current += 1;
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          // The callback ref may have already released the widget.
        }
        widgetId.current = null;
      }
    };
  }, []);

  const getToken = useCallback(async (): Promise<string> => {
    if (!TURNSTILE_SITE_KEY) return ""; // dev/local: backend tampoco lo exige
    // Token ya disponible -> úsalo y resetea para el próximo submit.
    if (tokenRef.current) {
      const t = tokenRef.current;
      tokenRef.current = "";
      const currentId = widgetId.current;
      if (currentId && window.turnstile) {
        scheduleTurnstileReset(window.turnstile, currentId, () =>
          Boolean(
            widgetId.current === currentId && elRef.current?.isConnected,
          ),
        );
      }
      return t;
    }
    // Challenge pendiente (o aún cargando): espera el callback, con timeout.
    return new Promise<string>((resolve) => {
      let settled = false;
      const finish = (t: string) => {
        if (settled) return;
        settled = true;
        tokenRef.current = "";
        const currentId = widgetId.current;
        if (currentId && window.turnstile) {
          scheduleTurnstileReset(window.turnstile, currentId, () =>
            Boolean(
              widgetId.current === currentId && elRef.current?.isConnected,
            ),
          );
        }
        resolve(t);
      };
      waiters.current.push(finish);
      // No colgar el submit indefinidamente si el reto nunca resuelve.
      setTimeout(() => finish(tokenRef.current || ""), 8000);
    });
  }, []);

  return { mountRef: mount, getToken, enabled: Boolean(TURNSTILE_SITE_KEY) };
}
