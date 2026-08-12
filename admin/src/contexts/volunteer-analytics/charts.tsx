"use client";

/**
 * Recharts client-only charts for volunteer analytics.
 * Colors from DESIGN.md tokens (see types.CHART_COLORS).
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_COLORS, SERIES_PALETTE, type VolunteerAnalyticsResponse } from "./types";

type ChartsProps = {
  data: VolunteerAnalyticsResponse;
};

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border-soft bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-ink">{title}</h3>
      <div className="h-56 w-full">{children}</div>
    </section>
  );
}

export function VolunteerAnalyticsCharts({ data }: ChartsProps) {
  const intents = data.intents.map((i) => ({ name: i.label, count: i.count }));
  const pipeline = data.pipeline.map((p) => ({ name: p.status, count: p.count }));
  const geo = data.geo.slice(0, 10).map((g) => ({ name: g.city, count: g.count }));
  const availability = data.availability.map((a) => ({ name: a.key, count: a.count }));
  const skills = data.digitalSkills.map((s) => ({ name: s.key, count: s.count }));
  const hourly = data.hourly.map((h) => ({ name: String(h.hour), count: h.count }));
  const sources = data.sources.map((s) => ({ name: s.key, count: s.count }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Intenciones">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={intents} layout="vertical" margin={{ left: 8, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill={CHART_COLORS.brandBlue} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Pipeline">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pipeline} dataKey="count" nameKey="name" outerRadius={80} label>
              {pipeline.map((_, i) => (
                <Cell key={pipeline[i]!.name} fill={SERIES_PALETTE[i % SERIES_PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Geografía">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={geo}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill={CHART_COLORS.volunteerGreen} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Disponibilidad">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={availability}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill={CHART_COLORS.brandNavy} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Skills digitales">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={skills}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill={CHART_COLORS.success} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Altas por hora">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={hourly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill={CHART_COLORS.warning} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Fuentes">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={sources} dataKey="count" nameKey="name" outerRadius={80} label>
              {sources.map((_, i) => (
                <Cell key={sources[i]!.name} fill={SERIES_PALETTE[i % SERIES_PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
