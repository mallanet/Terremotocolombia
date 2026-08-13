"use client";

import { memo } from "react";
import type { Earthquake } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import { magnitudeSeverity, severityMeta } from "@/lib/severity";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export interface EarthquakeCardProps {
  quake: Earthquake;
  now: number;
}

function localTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("es", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function EarthquakeCardImpl({ quake, now }: EarthquakeCardProps) {
  const sev = severityMeta(magnitudeSeverity(quake.magnitude));
  const mag = quake.magnitude === null ? "—" : quake.magnitude.toFixed(1);

  return (
    <li>
      <Card size="sm" className="border-l-4" style={{ borderLeftColor: sev.color }}>
        <CardContent className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">
              {sev.emoji} {quake.place}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span title={new Date(quake.occurredAt).toLocaleString("es")}>
                {timeAgo(quake.occurredAt, now)}
              </span>
              <span aria-hidden>·</span>
              <span>{localTime(quake.occurredAt)}</span>
              {quake.depthKm !== null && (
                <>
                  <span aria-hidden>·</span>
                  <span>{Math.round(quake.depthKm)} km prof.</span>
                </>
              )}
              {quake.tsunami ? (
                <Badge
                  variant="destructive"
                  className="text-[10px] font-bold tracking-wide uppercase"
                >
                  Tsunami
                </Badge>
              ) : null}
            </div>
          </div>
          <div
            className="shrink-0 font-heading text-2xl font-extrabold tabular-nums"
            style={{ color: sev.text }}
            aria-label={`Magnitud ${mag}`}
          >
            {mag}
          </div>
        </CardContent>
      </Card>
    </li>
  );
}

export const EarthquakeCard = memo(EarthquakeCardImpl);
