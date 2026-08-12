"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Languages } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { loadGoogleTranslateScript } from "@/lib/google-translate-loader";
import {
  TRANSLATE_LANGS,
  TRANSLATE_SOURCE_LANG,
  comboValueToLang,
  googTransCookieAssignments,
  googTransCookieValue,
  readGoogTransTarget,
  type TranslateLangCode,
} from "@/lib/translate";

declare global {
  interface Node {
    /** Marca de patchDomForGoogleTranslate para instalarlo una sola vez. */
    __gtPatched?: boolean;
  }
  interface Window {
    google?: {
      translate?: {
        TranslateElement: new (
          opts: {
            pageLanguage: string;
            includedLanguages: string;
            autoDisplay: boolean;
          },
          id: string,
        ) => void;
      };
    };
  }
}

const COMBO_POLL_MAX = 30;
const COMBO_POLL_MS = 100;

function getCookieLang(): TranslateLangCode {
  return readGoogTransTarget(document.cookie);
}

function writeGoogTransCookie(targetLang: TranslateLangCode) {
  const value = googTransCookieValue(targetLang);
  for (const assignment of googTransCookieAssignments(
    value,
    window.location.hostname,
  )) {
    document.cookie = assignment;
  }
}

/** Misma lógica para es/en/pt: cookie `googtrans=/es/<lang>` y reload. */
function selectLang(targetLang: TranslateLangCode) {
  if (targetLang === getCookieLang()) return;
  writeGoogTransCookie(targetLang);
  window.location.reload();
}

/**
 * Workaround del crash React + Google Translate: GT envuelve los text nodes en
 * <font>, así que cuando React intenta removeChild/insertBefore sobre el nodo
 * original (que ya no es hijo directo) lanza NotFoundError y desmonta el árbol
 * — botones que dejan de responder o pantalla en blanco tras traducir. El parche
 * degrada esos dos casos a no-op/append, tal como recomienda el issue de React
 * (facebook/react#11538). Solo se instala una vez y no afecta al DOM sin GT.
 */
function patchDomForGoogleTranslate() {
  if (typeof Node !== "function" || Node.prototype.__gtPatched) return;
  Node.prototype.__gtPatched = true;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) return child;
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      return this.appendChild(newNode) as T;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}

function attachComboListener(onLang: (lang: TranslateLangCode) => void) {
  let select: HTMLSelectElement | null = null;
  let handler: (() => void) | null = null;
  let attempts = 0;

  const tryAttach = () => {
    select = document.querySelector(".goog-te-combo");
    if (!select) {
      if (attempts++ < COMBO_POLL_MAX) {
        window.setTimeout(tryAttach, COMBO_POLL_MS);
      }
      return;
    }
    handler = () => onLang(comboValueToLang(select!.value));
    select.addEventListener("change", handler);
  };
  tryAttach();

  return () => {
    if (select && handler) select.removeEventListener("change", handler);
  };
}

function initGoogleTranslate() {
  if (!window.google?.translate?.TranslateElement) return;
  new window.google.translate.TranslateElement(
    {
      pageLanguage: TRANSLATE_SOURCE_LANG,
      includedLanguages: "en,pt",
      autoDisplay: false,
    },
    "google-translate-container",
  );
}

export default function TranslateWidget({
  variant = "default",
}: {
  variant?: "default" | "fab";
}) {
  // Servidor y primer render cliente deben usar el mismo idioma para evitar
  // una hidratación distinta cuando ya existe la cookie `googtrans`.
  const [activeLang, setActiveLang] =
    useState<TranslateLangCode>(TRANSLATE_SOURCE_LANG);
  // El script de Google Translate solo se pide cuando hace falta: traducción
  // ya activa (cookie) o primera interacción con el widget.
  const [gtRequested, setGtRequested] = useState(false);

  const handleLangApplied = useCallback((lang: TranslateLangCode) => {
    setActiveLang(lang);
  }, []);

  useEffect(() => {
    const lang = getCookieLang();
    // Con traducción activa el script debe cargar en cada página para que
    // esta se traduzca sola; sin cookie se difiere hasta la interacción.
    // La decisión se toma síncrona y no dentro del rAF: los navegadores
    // pausan rAF en pestañas ocultas y una página abierta en segundo plano
    // quedaría sin traducir hasta hacerse visible.
    if (lang !== TRANSLATE_SOURCE_LANG) setGtRequested(true);
    const syncFrame = window.requestAnimationFrame(() => {
      setActiveLang(lang);
    });
    return () => window.cancelAnimationFrame(syncFrame);
  }, []);

  useEffect(() => {
    if (!gtRequested) return;
    patchDomForGoogleTranslate();
    loadGoogleTranslateScript(initGoogleTranslate);
    return attachComboListener(handleLangApplied);
  }, [gtRequested, handleLangApplied]);

  const current = TRANSLATE_LANGS.find((lang) => lang.code === activeLang)!;
  const isTranslated = activeLang !== TRANSLATE_SOURCE_LANG;

  return (
    <div className="notranslate relative" translate="no">
      <div id="google-translate-container" className="hidden" aria-hidden />
      <DropdownMenu
        onOpenChange={(open) => {
          if (open) setGtRequested(true);
        }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size={variant === "fab" ? "default" : "sm"}
            aria-label="Cambiar idioma de la página"
            title={`Idioma: ${current.label}`}
            className={cn(
              "notranslate shrink-0 gap-1.5 rounded-full font-bold",
              variant === "fab"
                ? "h-11 px-3.5 text-xs shadow-lg shadow-black/20"
                : "h-9 px-3 text-xs",
              isTranslated &&
                "border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100 hover:text-sky-900",
            )}
          >
            {variant === "fab" ? (
              <>
                <Languages aria-hidden className="size-4" strokeWidth={2.2} />
                <span>{current.code.toUpperCase()}</span>
              </>
            ) : isTranslated ? (
              <span aria-hidden>{current.flag}</span>
            ) : (
              <Languages aria-hidden className="size-4" strokeWidth={2.2} />
            )}
            <span className="hidden sm:inline">{current.label}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side={variant === "fab" ? "top" : "bottom"}
          className="min-w-[10rem]"
        >
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Idioma
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {TRANSLATE_LANGS.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onSelect={() => selectLang(lang.code)}
              className={cn(
                "gap-2",
                activeLang === lang.code && "font-semibold",
              )}
            >
              <span aria-hidden>{lang.flag}</span>
              {lang.label}
              {activeLang === lang.code ? (
                <Check className="ml-auto size-3.5 opacity-70" aria-hidden />
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
