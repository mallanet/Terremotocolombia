"use client";

import { useState } from "react";
import { Button, MetricCard } from "@/src/ui";
import { VolunteerAnalyticsCharts } from "./charts";
import {
  useRefreshVolunteerAnalytics,
  useVolunteerAnalytics,
} from "./use-volunteer-analytics";
import type {
  VolunteerAnalyticsActions,
  VolunteerAnalyticsCallout,
  VolunteerAnalyticsResponse,
} from "./types";
import { CHART_COLORS } from "./types";

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

function FormCohortsTable({ data }: { data: VolunteerAnalyticsResponse["formCohorts"] }) {
  const rows = [
    { key: "structured", label: "Estructurado (con rol)", ...data.structured },
    { key: "intermediate", label: "Intermedio (oferta/skills)", ...data.intermediate },
    { key: "basic", label: "Básico (zona/oferta libre)", ...data.basic },
  ];
  return (
    <section className="rounded-lg border border-border-soft bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-ink">Cohortes de formulario</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border-soft text-ink-muted">
              <th className="py-2 pr-3 font-medium">Cohorte</th>
              <th className="py-2 pr-3 font-medium">Total</th>
              <th className="py-2 font-medium">Contactados</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-border-soft/60">
                <td className="py-2 pr-3 text-ink">{r.label}</td>
                <td className="py-2 pr-3 tabular-nums text-ink">{r.total}</td>
                <td className="py-2 tabular-nums text-ink">{r.contacted}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FieldCapacityStats({
  data,
}: {
  data: VolunteerAnalyticsResponse["fieldCapacity"];
}) {
  return (
    <section className="rounded-lg border border-border-soft bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-ink">Capacidad de campo</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Vehículo propio" value={String(data.vehicle)} accent={CHART_COLORS.brandBlue} />
        <MetricCard label="Entrenamiento rescate" value={String(data.rescue)} accent={CHART_COLORS.warning} />
        <MetricCard label="Experiencia crisis" value={String(data.crisis)} accent={CHART_COLORS.crisisRed} />
      </div>
    </section>
  );
}

function ActionCards({ actions }: { actions: VolunteerAnalyticsActions }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-ink">Acciones prioritarias</h3>
      <div className="grid gap-3 lg:grid-cols-3">
        <article className="rounded-lg border border-crisis/40 bg-red-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-crisis">{actions.p0.priority}</p>
          <h4 className="mt-1 text-base font-semibold text-ink">{actions.p0.title}</h4>
          <p className="mt-2 text-3xl font-bold tabular-nums text-crisis">{actions.p0.count}</p>
          <p className="mt-1 text-xs text-ink-muted">
            Pending escasos a contactar (salud → estructural → transporte → psicosocial).
          </p>
          {actions.p0.breakdown.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-ink-muted">
              {actions.p0.breakdown.map((b) => (
                <li key={b.key}>
                  {b.label}: {b.pending}
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="rounded-lg border border-amber-400/50 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">{actions.p1.priority}</p>
          <h4 className="mt-1 text-base font-semibold text-ink">{actions.p1.title}</h4>
          <p className="mt-2 text-3xl font-bold tabular-nums text-amber-900">{actions.p1.count}</p>
          <p className="mt-1 text-xs text-ink-muted">
            Volumen acopio + logística · tareas disponibles: {actions.p1.tasks}
            {actions.p1.tasks === 0 ? " (sin despacho)" : ""}.
          </p>
        </article>

        <article className="rounded-lg border border-brand-blue/40 bg-blue-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-navy">{actions.p2.priority}</p>
          <h4 className="mt-1 text-base font-semibold text-ink">{actions.p2.title}</h4>
          <p className="mt-2 text-3xl font-bold tabular-nums text-brand-navy">{actions.p2.count}</p>
          <p className="mt-1 text-xs text-ink-muted">Banco remoto (modalidad digital).</p>
        </article>
      </div>
    </section>
  );
}

function last24hSinceIso(now = Date.now()): string {
  return new Date(now - 24 * 60 * 60 * 1000).toISOString();
}

export function VolunteerAnalyticsBoard() {
  const [since, setSince] = useState<string | null>(null);
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

  const showFullCorpus = () => setSince(null);
  const showLast24h = () => setSince(last24hSinceIso());

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
            Agregados operativos (sin PII).{" "}
            {since
              ? `Últimas 24h${data.cohort?.since ? ` · desde ${data.cohort.since}` : ""}.`
              : "Corpus completo."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={since == null ? "primary" : "ghost"}
            onClick={showFullCorpus}
          >
            Corpus completo
          </Button>
          <Button
            type="button"
            variant={since != null ? "primary" : "ghost"}
            onClick={showLast24h}
          >
            Últimas 24h
          </Button>
          <Button type="button" onClick={() => void onRefresh()} disabled={refreshing}>
            Actualizar
          </Button>
        </div>
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

      <ActionCards actions={data.actions} />

      <div className="grid gap-4 lg:grid-cols-2">
        <FormCohortsTable data={data.formCohorts} />
        <FieldCapacityStats data={data.fieldCapacity} />
      </div>

      <VolunteerAnalyticsCharts data={data} />
    </div>
  );
}
