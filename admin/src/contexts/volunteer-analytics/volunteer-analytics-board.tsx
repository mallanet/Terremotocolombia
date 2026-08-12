"use client";

import { useState } from "react";
import { Button, MetricCard } from "@/src/ui";
import { VolunteerAnalyticsCharts } from "./charts";
import {
  useRefreshVolunteerAnalytics,
  useVolunteerAnalytics,
} from "./use-volunteer-analytics";
import type { VolunteerAnalyticsCallout } from "./types";

function CalloutBanner({ callout }: { callout: VolunteerAnalyticsCallout }) {
  const tone =
    callout.severity === "critical"
      ? "border-crisis bg-red-50 text-crisis"
      : callout.severity === "warning"
        ? "border-amber-400 bg-amber-50 text-amber-900"
        : "border-brand-blue bg-blue-50 text-brand-navy";
  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${tone}`} role="status">
      {callout.message}
    </div>
  );
}

export function VolunteerAnalyticsBoard() {
  const [since] = useState<string | null>(null);
  const query = useVolunteerAnalytics(since);
  const refresh = useRefreshVolunteerAnalytics(since);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  if (query.isLoading) {
    return <p className="text-sm text-ink-muted">Cargando analítica…</p>;
  }

  if (query.isError) {
    const status = (query.error as Error & { status?: number }).status;
    return (
      <div className="rounded-md border border-crisis bg-red-50 p-4 text-sm text-crisis" role="alert">
        {status === 403
          ? "403 — no tienes permiso (volunteer:read) para ver esta analítica."
          : query.error instanceof Error
            ? query.error.message
            : "Error al cargar analítica."}
      </div>
    );
  }

  const data = query.data!;
  if (data.empty) {
    return (
      <div className="space-y-4">
        <header className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-ink">Analítica de voluntarios</h1>
          <Button type="button" onClick={() => void onRefresh()} disabled={refreshing}>
            Actualizar
          </Button>
        </header>
        <div
          className="rounded-md border border-amber-400 bg-amber-50 p-4 text-sm text-amber-950"
          role="status"
        >
          Analítica vacía / bloqueada: no hay voluntarios en el corpus (o filtro).
          No se muestran gráficos vacíos como éxito.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">Analítica de voluntarios</h1>
          <p className="text-sm text-ink-muted">
            Agregados operativos (sin PII). Corpus completo
            {data.cohort?.since ? ` · desde ${data.cohort.since}` : ""}.
          </p>
        </div>
        <Button type="button" onClick={() => void onRefresh()} disabled={refreshing}>
          Actualizar
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Voluntarios" value={String(data.kpis.volunteers)} />
        <MetricCard
          label="Pending"
          value={String(data.kpis.pending)}
          accent="#FBB658"
        />
        <MetricCard
          label="Contacted"
          value={String(data.kpis.contacted)}
          accent="#10B981"
        />
        <MetricCard label="Tareas" value={String(data.kpis.tasks)} />
        <MetricCard label="Asignaciones" value={String(data.kpis.assignments)} />
      </div>

      {data.callouts.length > 0 && (
        <div className="space-y-2">
          {data.callouts.map((c) => (
            <CalloutBanner key={c.id} callout={c} />
          ))}
        </div>
      )}

      <VolunteerAnalyticsCharts data={data} />
    </div>
  );
}
