import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GOOGLE_TRANSLATE_SCRIPT_ID,
  loadGoogleTranslateScript,
} from "@/lib/google-translate-loader";

// El runner corre en entorno "node" (sin jsdom ni testing-library), así que
// no se puede montar TranslateWidget; se prueba la lógica extraída del
// loader, que es la ÚNICA vía de inyección del script de Google Translate.
// El widget solo la invoca con traducción activa (cookie googtrans) o cuando
// el usuario abre el selector — nunca al montarse en una página sin traducir.

interface FakeScript {
  id: string;
  src: string;
  async: boolean;
}

/** DOM mínimo: registra los <script> añadidos a <head> para poder contarlos. */
function installFakeDom() {
  const appended: FakeScript[] = [];
  const fakeDocument = {
    getElementById: (id: string) =>
      appended.find((node) => node.id === id) ?? null,
    createElement: (): FakeScript => ({ id: "", src: "", async: false }),
    head: {
      appendChild: (node: FakeScript) => {
        appended.push(node);
        return node;
      },
    },
  };
  const fakeWindow: { googleTranslateElementInit?: () => void } = {};
  vi.stubGlobal("document", fakeDocument);
  vi.stubGlobal("window", fakeWindow);
  return { appended, fakeWindow };
}

describe("google translate loader", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("no inyecta nada al importar el módulo (carga diferida)", async () => {
    const { appended } = installFakeDom();
    // Reevalúa el módulo con el DOM falso instalado: si tuviera un efecto de
    // inyección a nivel de import (como el código previo al refactor), appended
    // dejaría de estar vacío.
    vi.resetModules();
    await import("@/lib/google-translate-loader");
    expect(appended).toHaveLength(0);
  });

  it("inyecta el script de translate.google.com al invocarse", () => {
    const { appended, fakeWindow } = installFakeDom();
    const init = () => {};

    loadGoogleTranslateScript(init);

    expect(appended).toHaveLength(1);
    expect(appended[0].id).toBe(GOOGLE_TRANSLATE_SCRIPT_ID);
    expect(appended[0].src).toContain(
      "https://translate.google.com/translate_a/element.js",
    );
    expect(appended[0].async).toBe(true);
    expect(fakeWindow.googleTranslateElementInit).toBe(init);
  });

  it("llamadas repetidas no duplican el script ni pisan el callback", () => {
    const { appended, fakeWindow } = installFakeDom();
    const first = () => {};
    const second = () => {};

    loadGoogleTranslateScript(first);
    loadGoogleTranslateScript(second);
    loadGoogleTranslateScript(second);

    expect(appended).toHaveLength(1);
    expect(fakeWindow.googleTranslateElementInit).toBe(first);
  });

  it("es un no-op sin DOM (SSR)", () => {
    expect(() => loadGoogleTranslateScript(() => {})).not.toThrow();
  });
});
