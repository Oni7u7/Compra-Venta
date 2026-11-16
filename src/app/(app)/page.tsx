import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  BadgePercentIcon,
  DatabaseIcon,
  ShoppingBagIcon,
  TrendingUpIcon,
  WalletIcon,
} from "lucide-react";
import { ChannelChart, MonthlyChart, TopProductsChart } from "@/components/dashboard-charts";
import { DateRangeFilter } from "@/components/date-range-filter";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { formatDate, formatMXN, formatPct } from "@/lib/format";
import { resolveRange } from "@/lib/range";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

type Dashboard = {
  ventas: number;
  compras: number;
  costo_ventas: number;
  utilidad: number;
  margen_pct: number | null;
  num_ventas: number;
  num_compras: number;
  top_productos: { nombre: string; utilidad: number; ventas: number }[];
  por_canal: { canal: string; ventas: number; num: number }[];
};

function delta(current: number, previous: number) {
  if (!previous) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  await requireUser();
  const range = resolveRange(await searchParams);
  const supabase = await createClient();

  const [cur, prev, monthly] = await Promise.all([
    supabase.rpc("cv_dashboard", { p_from: range.desde, p_to: range.hasta }),
    supabase.rpc("cv_dashboard", { p_from: range.prevDesde, p_to: range.prevHasta }),
    supabase.rpc("cv_monthly_summary", { p_from: range.desde, p_to: range.hasta }),
  ]);
  if (cur.error) throw new Error(cur.error.message);
  if (monthly.error) throw new Error(monthly.error.message);

  const d = cur.data as Dashboard;
  const p = (prev.data ?? null) as Dashboard | null;

  const kpis = [
    { label: "Ventas", value: formatMXN(d.ventas), hint: `${d.num_ventas} registros`, icon: WalletIcon, change: p && delta(d.ventas, p.ventas) },
    { label: "Compras", value: formatMXN(d.compras), hint: `${d.num_compras} compras`, icon: ShoppingBagIcon, change: p && delta(d.compras, p.compras), invert: true },
    { label: "Utilidad bruta", value: formatMXN(d.utilidad), hint: `Costo de lo vendido ${formatMXN(d.costo_ventas)}`, icon: TrendingUpIcon, change: p && delta(d.utilidad, p.utilidad) },
    {
      label: "Margen",
      value: formatPct(d.margen_pct),
      hint: "Utilidad / ventas",
      icon: BadgePercentIcon,
      change: p && p.margen_pct !== null && d.margen_pct !== null ? Number(d.margen_pct) - Number(p.margen_pct) : null,
      points: true,
    },
  ];

  const empty = d.num_ventas === 0 && d.num_compras === 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Del ${formatDate(range.desde)} al ${formatDate(range.hasta)} · comparado con los ${range.days} días anteriores`}
      >
        <DateRangeFilter desde={range.desde} hasta={range.hasta} today={range.today} />
      </PageHeader>

      {empty ? (
        <EmptyState icon={DatabaseIcon} title="Sin datos en este periodo" description="Cambia el rango de fechas o registra compras y ventas.">
          <Link href="/importar" className={buttonVariants()}>
            Importar CSV
          </Link>
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map(({ label, value, hint, icon: Icon, change, invert, points }) => {
              const up = (change ?? 0) >= 0;
              const good = invert ? !up : up;
              return (
                <Card key={label}>
                  <CardHeader className="flex flex-row items-center justify-between gap-2">
                    <CardDescription>{label}</CardDescription>
                    <Icon className="size-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <p className="text-2xl font-semibold tabular-nums">{value}</p>
                    <div className="flex items-center gap-2 text-xs">
                      {change !== null && change !== undefined && Number.isFinite(change) && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-0.5 font-medium tabular-nums",
                            good ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400",
                          )}
                        >
                          {up ? <ArrowUpRightIcon className="size-3" /> : <ArrowDownRightIcon className="size-3" />}
                          {points ? `${Math.abs(change).toFixed(1)} pts` : `${Math.abs(change).toFixed(1)}%`}
                        </span>
                      )}
                      <span className="truncate text-muted-foreground">{hint}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Ventas vs compras por mes</CardTitle>
              <CardDescription>La utilidad descuenta el costo promedio ponderado de lo vendido</CardDescription>
            </CardHeader>
            <CardContent>
              <MonthlyChart data={monthly.data ?? []} />
            </CardContent>
          </Card>

          <div className="mt-4 grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Top 10 productos por utilidad</CardTitle>
                <CardDescription>En el periodo seleccionado</CardDescription>
              </CardHeader>
              <CardContent>
                <TopProductsChart data={d.top_productos} />
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Ventas por canal</CardTitle>
                <CardDescription>Participación en el importe vendido</CardDescription>
              </CardHeader>
              <CardContent>
                <ChannelChart data={d.por_canal} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
