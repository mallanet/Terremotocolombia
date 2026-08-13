"use client";

import { deploymentConfig } from "@/lib/deployment-config";
import { SITE_BRAND_NAME, SITE_PRODUCT_NAME } from "@/lib/site";
import { useEffect } from "react";
import { reportClientError } from "@/lib/client-errors";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError("global-boundary", error, { digest: error.digest });
  }, [error]);

  return (
    <html lang={deploymentConfig.languageTag}>
      <body className="global-error">
        <style>{`
          .global-error { margin: 0; min-height: 100vh; display: flex; flex-direction: column; background: #eef2f7; color: #0f2154; font-family: "IBM Plex Sans", sans-serif; }
          .global-error__flag { height: 5px; background: linear-gradient(to right, #FCD116 0 40%, #003893 40% 70%, #CE1126 70% 100%); }
          .global-error__header { padding: 14px 24px; border-bottom: 1px solid #dce3ec; background: #fff; font-family: Sora, sans-serif; font-size: 18px; font-weight: 700; }
          .global-error__header small { display: block; color: #52606d; font: 600 11px/1.2 "IBM Plex Sans", sans-serif; text-transform: uppercase; letter-spacing: .08em; }
          .global-error__main { flex: 1; display: grid; place-items: center; padding: 24px; text-align: center; }
          .global-error__panel { max-width: 28rem; }
          .global-error__button { min-height: 44px; margin-top: 16px; padding: 10px 20px; border: 0; border-radius: 8px; background: #4080f2; color: #fff; font: 700 16px/1 "IBM Plex Sans", sans-serif; cursor: pointer; }
          .global-error__footer { padding: 24px; background: #0f2154; color: #e1eaff; text-align: center; font-size: 13px; }
          @media (prefers-color-scheme: dark) { .global-error { background: #0f2154; color: #e1eaff; } .global-error__header { background: #132236; border-color: #28425c; } .global-error__header small { color: #a8b8c8; } }
        `}</style>
        <div aria-hidden className="global-error__flag" />
        <header className="global-error__header">
          {SITE_BRAND_NAME}
          <small>{SITE_PRODUCT_NAME}</small>
        </header>
        <main id="main" className="global-error__main">
          <div className="global-error__panel">
            <h1
              style={{
                fontFamily: "Sora, sans-serif",
                fontSize: "1.5rem",
                fontWeight: 700,
                margin: "0.5rem 0",
              }}
            >
              Algo salió mal
            </h1>
            <p style={{ lineHeight: 1.5 }}>
              La aplicación tuvo un error inesperado. Recarga la página para
              continuar.
            </p>
            <button
              type="button"
              onClick={reset}
              className="global-error__button"
            >
              Recargar
            </button>
          </div>
        </main>
        <footer className="global-error__footer">
          Plataforma ciudadana — Mallanet.org
        </footer>
      </body>
    </html>
  );
}
