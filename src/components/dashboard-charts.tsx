"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMonth, formatMXN } from "@/lib/format";

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--popover-foreground)",
  fontSize: 12,
};

const compact = (v: number) =>
  Math.abs(v) >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`;

export function MonthlyChart({
  data,
}: {
  data: { mes: string; compras: number; ventas: number; utilidad: number }[];
}) {
  const rows = data.map((d) => ({
    label: formatMonth(d.mes),
    Ventas: Number(d.ventas),
    Compras: Number(d.compras),
    Utilidad: Number(d.utilidad),
  }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
          <YAxis tickLine={false} axisLine={false} fontSize={12} width={52} stroke="var(--muted-foreground)" tickFormatter={compact} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatMXN(Number(v))} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="Ventas" stroke="var(--chart-1)" strokeWidth={2.5} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="Compras" stroke="var(--chart-2)" strokeWidth={2.5} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="Utilidad" stroke="var(--chart-4)" strokeWidth={2} strokeDasharray="5 4" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopProductsChart({ data }: { data: { nombre: string; utilidad: number }[] }) {
  const rows = data.map((d) => ({ ...d, utilidad: Number(d.utilidad) }));
  return (
    <div className="w-full" style={{ height: Math.max(160, rows.length * 34 + 20) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" tickFormatter={compact} />
          <YAxis
            type="category"
            dataKey="nombre"
            tickLine={false}
            axisLine={false}
            fontSize={11}
            width={140}
            stroke="var(--muted-foreground)"
            tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 17)}…` : v)}
          />
          <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={tooltipStyle} formatter={(v) => [formatMXN(Number(v)), "Utilidad"]} />
          <Bar dataKey="utilidad" radius={[0, 6, 6, 0]} maxBarSize={22}>
            {rows.map((r) => (
              <Cell key={r.nombre} fill={r.utilidad < 0 ? "var(--destructive)" : "var(--chart-1)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const CANAL_COLORS: Record<string, string> = {
  tienda: "var(--chart-1)",
  online: "var(--chart-2)",
  mayoreo: "var(--chart-3)",
};
const CANAL_LABEL: Record<string, string> = { tienda: "Tienda", online: "Online", mayoreo: "Mayoreo" };

export function ChannelChart({ data }: { data: { canal: string; ventas: number }[] }) {
  const total = data.reduce((acc, d) => acc + Number(d.ventas), 0);
  const rows = data.map((d) => ({ name: CANAL_LABEL[d.canal] ?? d.canal, canal: d.canal, value: Number(d.ventas) }));
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row lg:flex-col xl:flex-row">
      <div className="h-48 w-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" innerRadius={52} outerRadius={80} paddingAngle={2} stroke="none">
              {rows.map((r) => (
                <Cell key={r.canal} fill={CANAL_COLORS[r.canal] ?? "var(--chart-5)"} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatMXN(Number(v))} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.canal} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: CANAL_COLORS[r.canal] }} />
            <span className="flex-1">{r.name}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {total ? ((r.value / total) * 100).toFixed(1) : 0}%
            </span>
            <span className="font-medium tabular-nums">{formatMXN(r.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
