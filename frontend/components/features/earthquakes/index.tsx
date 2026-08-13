"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useEarthquakes } from "@/hooks/emergency";
import { useTick } from "@/hooks/useTick";
import { qk } from "@/lib/query-keys";
import { deploymentConfig } from "@/lib/deployment-config";
import {
  EARTHQUAKES_CADENCE_COPY_ES,
  earthquakesPanelSubtitle,
  earthquakesQuietMessage,
  resolveEarthquakesPanelView,
} from "@/lib/earthquakes-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { EarthquakeCard } from "./EarthquakeCard";

const USGS_MAP_URL = "https://earthquake.usgs.gov/earthquakes/map/";
const POLL_MS = 60_000;
const MIN_MAG_OPTIONS = [2, 3, 4, 5] as const;
const INITIAL_VISIBLE = 8;

export default function EarthquakesPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useEarthquakes(POLL_MS);
  const quakes = data?.earthquakes;
  const syncFetchedAt = data?.sync?.fetchedAt ?? null;
  const [minMag, setMinMag] = useState<(typeof MIN_MAG_OPTIONS)[number]>(2);
  const [showAll, setShowAll] = useState(false);
  const now = useTick();

  // Magnitude filter only — Slice A does not add a client time-window cut.
  const filtered = useMemo(
    () => (quakes ?? []).filter((q) => (q.magnitude ?? 0) >= minMag),
    [quakes, minMag],
  );
  const visible = showAll ? filtered : filtered.slice(0, INITIAL_VISIBLE);
  const hidden = filtered.length - visible.length;
  const view = resolveEarthquakesPanelView({
    isLoading,
    isError,
    filteredCount: filtered.length,
  });

  return (
    <section
      aria-labelledby="earthquakes-heading"
      className="bg-muted px-5 py-[clamp(48px,5vw,72px)]"
    >
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-[720px]">
            <h2
              id="earthquakes-heading"
              className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl"
            >
              Sismos recientes
            </h2>
            <Separator className="mt-3.5 h-[3px] w-[72px] rounded-full bg-secondary" />
            <p className="mt-3 max-w-[58ch] text-base leading-relaxed text-muted-foreground sm:text-lg">
              {earthquakesPanelSubtitle(deploymentConfig.regionLabel)}
            </p>
          </div>
          <div
            role="group"
            aria-label="Magnitud mínima"
            className="flex shrink-0 items-center gap-1 rounded-full border bg-background p-1"
          >
            {MIN_MAG_OPTIONS.map((m) => (
              <Button
                key={m}
                type="button"
                size="sm"
                variant={minMag === m ? "default" : "ghost"}
                aria-pressed={minMag === m}
                onClick={() => {
                  setMinMag(m);
                  setShowAll(false);
                }}
                className="rounded-full px-3"
              >
                {m}+
              </Button>
            ))}
          </div>
        </div>

        {view === "loading" ? (
          <ul className="flex flex-col gap-2" aria-hidden>
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i}>
                <Skeleton className="h-16 rounded-xl" />
              </li>
            ))}
          </ul>
        ) : view === "error" ? (
          <Alert variant="destructive">
            <AlertTitle>No se pudieron cargar los sismos</AlertTitle>
            <AlertDescription>
              Puede ser un problema temporal. También puedes consultar USGS.
            </AlertDescription>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  void queryClient.invalidateQueries({ queryKey: qk.earthquakes.list })
                }
              >
                Reintentar
              </Button>
              <Button asChild variant="link" size="sm">
                <a href={USGS_MAP_URL} target="_blank" rel="noopener noreferrer">
                  Ver en USGS
                </a>
              </Button>
            </div>
          </Alert>
        ) : view === "quiet" ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {earthquakesQuietMessage({
              minMag,
              syncFetchedAt,
              nowMs: now,
            })}
          </p>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {visible.map((q) => (
                <EarthquakeCard key={q.id} quake={q} now={now} />
              ))}
            </ul>
            {hidden > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAll(true)}
                className="mt-2 w-full"
              >
                Ver más ({hidden})
              </Button>
            )}
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Fuente:{" "}
              <a
                href={USGS_MAP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                USGS
              </a>
              {" · "}
              {EARTHQUAKES_CADENCE_COPY_ES}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
