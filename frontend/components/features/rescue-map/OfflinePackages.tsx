"use client";

import { Download, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type {
  RescueMapIncident,
  RescueMapLanguage,
  RescueMapMappingSnapshot,
} from "@/lib/rescue-map";
import {
  estimateRescueOfflinePackageBytes,
  isOfflinePackageStale,
  listRescueOfflinePackages,
  removeRescueOfflinePackage,
  saveRescueOfflinePackage,
  type RescueMapOfflinePackage,
} from "@/lib/rescue-map-offline";

const copy = {
  es: {
    intro:
      "Cada paquete guarda la geometría AOI y sus metadatos operativos. No incluye tiles de OpenStreetMap ni Esri; esas imágenes requieren conexión.",
    budget: "Presupuesto inicial: 8 MB para datos operativos.",
    download: "Descargar",
    remove: "Eliminar",
    saved: "Guardado",
    stale: "Versión obsoleta",
    current: "Vigente",
    savedMessage: "Paquete offline guardado correctamente.",
    removedMessage: "Paquete offline eliminado.",
    genericError:
      "La descarga no se completó. No se guardó un paquete parcial.",
    empty: "Aún no hay paquetes descargados.",
    coverage: "Cobertura",
    date: "Descargado",
  },
  en: {
    intro:
      "Each package stores the AOI geometry and operational metadata. It does not include OpenStreetMap or Esri tiles; those images require a connection.",
    budget: "Initial budget: 8 MB for operational data.",
    download: "Download",
    remove: "Delete",
    saved: "Saved",
    stale: "Outdated version",
    current: "Current",
    savedMessage: "Offline package saved.",
    removedMessage: "Offline package deleted.",
    genericError:
      "The download did not complete. No partial package was saved.",
    empty: "No offline packages have been downloaded.",
    coverage: "Coverage",
    date: "Downloaded",
  },
} as const;

function formatBytes(value: number, language: RescueMapLanguage): string {
  return new Intl.NumberFormat(language === "es" ? "es-CO" : "en-US", {
    maximumFractionDigits: 1,
  }).format(value / 1024) + " KB";
}

function formatDate(value: number, language: RescueMapLanguage): string {
  return new Intl.DateTimeFormat(language === "es" ? "es-CO" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default function OfflinePackages({
  incident,
  mapping,
  language,
}: {
  incident: RescueMapIncident;
  mapping: RescueMapMappingSnapshot;
  language: RescueMapLanguage;
}) {
  const [packages, setPackages] = useState<RescueMapOfflinePackage[]>([]);
  const [pendingAoi, setPendingAoi] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    kind: "status" | "error";
    text: string;
  } | null>(null);
  const text = copy[language];
  const packageByAoi = useMemo(
    () => new Map(packages.map((item) => [item.aoiId, item])),
    [packages],
  );

  useEffect(() => {
    let active = true;
    listRescueOfflinePackages()
      .then((items) => {
        if (active) setPackages(items);
      })
      .catch(() => {
        if (active) {
          setMessage({ kind: "error", text: text.genericError });
        }
      });
    return () => {
      active = false;
    };
  }, [text.genericError]);

  const refresh = async () => {
    setPackages(await listRescueOfflinePackages());
  };

  const download = async (aoiId: string) => {
    const aoi = mapping.aois.find((candidate) => candidate.id === aoiId);
    if (!aoi) return;
    setPendingAoi(aoiId);
    setMessage(null);
    try {
      await saveRescueOfflinePackage(incident, mapping, aoi);
      await refresh();
      setMessage({ kind: "status", text: text.savedMessage });
    } catch (error) {
      const errorMessage =
        error instanceof Error && error.message
          ? error.message
          : text.genericError;
      setMessage({ kind: "error", text: errorMessage });
    } finally {
      setPendingAoi(null);
    }
  };

  const remove = async (aoiId: string) => {
    setPendingAoi(aoiId);
    setMessage(null);
    try {
      await removeRescueOfflinePackage(aoiId);
      await refresh();
      setMessage({ kind: "status", text: text.removedMessage });
    } catch {
      setMessage({ kind: "error", text: text.genericError });
    } finally {
      setPendingAoi(null);
    }
  };

  return (
    <>
      <p className="e-rescue-package-copy">{text.intro}</p>
      <p className="e-rescue-package-copy">{text.budget}</p>
      <ul className="e-rescue-package-list">
        {mapping.aois.map((aoi) => {
          const saved = packageByAoi.get(aoi.id);
          const stale = saved ? isOfflinePackageStale(saved, mapping) : false;
          const size = saved?.sizeBytes ??
            estimateRescueOfflinePackageBytes(incident, mapping, aoi);
          const name = aoi.name[language];
          return (
            <li key={aoi.id} data-testid={`offline-package-${aoi.id}`}>
              <div className="e-rescue-package-row">
                <div>
                  <strong>
                    AOI {String(aoi.number).padStart(2, "0")} · {name}
                  </strong>
                  <span className="e-rescue-package-meta">
                    {text.coverage}: {name} · {formatBytes(size, language)}
                  </span>
                  {saved ? (
                    <span className="e-rescue-package-meta">
                      {text.date}: {formatDate(saved.savedAt, language)} ·{" "}
                      {stale ? text.stale : text.current}
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="e-rescue-package-button"
                  data-action={saved ? "delete" : "download"}
                  disabled={pendingAoi === aoi.id}
                  aria-label={`${saved ? text.remove : text.download} ${name}`}
                  onClick={() =>
                    void (saved ? remove(aoi.id) : download(aoi.id))
                  }
                >
                  {saved ? (
                    <Trash2 aria-hidden size={15} />
                  ) : (
                    <Download aria-hidden size={15} />
                  )}
                  {pendingAoi === aoi.id
                    ? "…"
                    : saved
                      ? text.remove
                      : text.download}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      {packages.length === 0 ? (
        <p className="e-rescue-package-message">{text.empty}</p>
      ) : null}
      {message ? (
        <p
          className="e-rescue-package-message"
          role={message.kind === "error" ? "alert" : "status"}
          aria-live={message.kind === "error" ? "assertive" : "polite"}
        >
          {message.text}
        </p>
      ) : null}
    </>
  );
}
