"use client";

import { Download, Smartphone } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { RescueMapLanguage } from "@/lib/rescue-map";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

function subscribeToInstallState(onStoreChange: () => void) {
  const media = window.matchMedia("(display-mode: standalone)");
  window.addEventListener("appinstalled", onStoreChange);
  media.addEventListener("change", onStoreChange);
  return () => {
    window.removeEventListener("appinstalled", onStoreChange);
    media.removeEventListener("change", onStoreChange);
  };
}

function getInstalledSnapshot() {
  const nav = navigator as NavigatorWithStandalone;
  return (
    nav.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

function getPlatformSnapshot(): "ios" | "android" | "other" {
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return "ios";
  if (/Android/.test(navigator.userAgent)) return "android";
  return "other";
}

function subscribeToStaticPlatform() {
  return () => {};
}

const copy = {
  es: {
    installed: "La app ya está abierta en modo instalado.",
    button: "Instalar app",
    ios:
      "En iPhone o iPad: abre esta ruta en Safari, toca Compartir y elige “Añadir a pantalla de inicio”.",
    android:
      "En Android: toca “Instalar app”. Si el botón no aparece, abre el menú ⋮ del navegador y elige “Instalar app” o “Añadir a pantalla de inicio”.",
    generic:
      "En el menú del navegador, elige “Instalar app” o “Añadir a pantalla de inicio”. La web seguirá funcionando normalmente si no la instalas.",
    accepted: "Instalación iniciada. El icono abrirá directamente este mapa.",
    dismissed: "Instalación cancelada. Puedes seguir usando el mapa en el navegador.",
  },
  en: {
    installed: "The app is already open in installed mode.",
    button: "Install app",
    ios:
      "On iPhone or iPad: open this route in Safari, tap Share, then choose “Add to Home Screen”.",
    android:
      "On Android: tap “Install app”. If the button is unavailable, open the browser ⋮ menu and choose “Install app” or “Add to Home screen”.",
    generic:
      "Open the browser menu and choose “Install app” or “Add to Home screen”. The website still works normally without installation.",
    accepted: "Installation started. The icon will open this map directly.",
    dismissed: "Installation cancelled. You can keep using the map in the browser.",
  },
} as const;

export default function InstallRescueMap({
  language,
}: {
  language: RescueMapLanguage;
}) {
  const [promptEvent, setPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const installed = useSyncExternalStore(
    subscribeToInstallState,
    getInstalledSnapshot,
    () => false,
  );
  const platform = useSyncExternalStore(
    subscribeToStaticPlatform,
    getPlatformSnapshot,
    () => "other",
  );
  const [message, setMessage] = useState<string | null>(null);
  const text = copy[language];

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setMessage(choice.outcome === "accepted" ? text.accepted : text.dismissed);
    setPromptEvent(null);
  };

  if (installed) {
    return (
      <p className="e-rescue-install-copy" data-testid="rescue-installed-state">
        <Smartphone aria-hidden size={15} /> {text.installed}
      </p>
    );
  }

  const instructions =
    platform === "ios"
      ? text.ios
      : platform === "android"
        ? text.android
        : text.generic;

  return (
    <>
      <p className="e-rescue-install-copy">{instructions}</p>
      {promptEvent ? (
        <button
          type="button"
          className="e-rescue-install-button"
          onClick={() => void install()}
        >
          <Download aria-hidden size={16} />
          {text.button}
        </button>
      ) : null}
      {message ? (
        <p className="e-rescue-package-message" role="status" aria-live="polite">
          {message}
        </p>
      ) : null}
    </>
  );
}
