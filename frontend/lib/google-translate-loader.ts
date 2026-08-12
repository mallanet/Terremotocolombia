// Inyección DIFERIDA del script de Google Translate (mismo patrón de carga
// perezosa que loadScript en hooks/useTurnstile.tsx). element.js encadena
// peticiones a www.gstatic.com, translate.googleapis.com y un JSONP a
// translate-pa.googleapis.com (ver la CSP en next.config.ts), así que no debe
// cargarse en cada ruta: solo cuando hay traducción activa o el usuario abre
// el widget.

export const GOOGLE_TRANSLATE_SCRIPT_ID = "google-translate-script";

const SCRIPT_SRC =
  "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
  }
}

/**
 * Inyecta el script una sola vez (idempotente por id en el DOM). `onInit` se
 * asigna como callback global solo al inyectar: si el script ya está en el
 * DOM, Google Translate ya se inicializó con el callback previo.
 */
export function loadGoogleTranslateScript(onInit: () => void): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(GOOGLE_TRANSLATE_SCRIPT_ID)) return;

  window.googleTranslateElementInit = onInit;

  const script = document.createElement("script");
  script.id = GOOGLE_TRANSLATE_SCRIPT_ID;
  script.src = SCRIPT_SRC;
  script.async = true;
  document.head.appendChild(script);
}
