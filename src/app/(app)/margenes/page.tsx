import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangleIcon, ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, BadgePercentIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { formatMXN, formatNumber, formatPct } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { ProductMargin } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Márgenes" };

const UMBRAL = 15;

const COLUMNS = [
  { key: "nombre", label: "Producto", align: "left" },
  { key: "costo_promedio", label: "Costo prom.", align: "right", className: "hidden md:table-cell" },
  { key: "precio_promedio", label: "Precio prom.", align: "right", className: "hidden md:table-cell" },
  { key: "margen", label: "Margen $", align: "right", className: "hidden lg:table-cell" },
  { key: "margen_pct", label: "Margen %", align: "right" },
  { key: "unidades_vendidas", label: "Vendidas", align: "right", className: "hidden sm:table-cell" },
  { key: "utilidad_total", label: "Utilidad", align: "right" },
] as const;

type SortKey = (typeof COLUMNS)[number]["key"];

export default async function MargenesPage({ searchParams }: PageProps<"/margenes">) {
  await requireUser();
  const sp = await searchParams;
  const orden: SortKey = COLUMNS.some((c) => c.key === sp.orden) ? (sp.orden as SortKey) : "margen_pct";
  const dir = sp.dir === "desc" ? "desc" : "asc";
  const soloAlertas = sp.alertas === "1";

  const supabase = await createClient();
  let query = supabase
    .from("cv_product_margin")
    .select("*")
    .order(orden, { ascending: dir === "asc", nullsFirst: false });
  if (soloAlertas) query = query.lt("margen_pct", UMBRAL);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as ProductMargin[];

  const { count: alertas } = await supabase
    .from("cv_product_margin")
    .select("product_id", { count: "exact", head: true })
    .lt("margen_pct", UMBRAL);

  const href = (next: Record<string, string>) => {
    const params = new URLSearchParams({ orden, dir, ...(soloAlertas ? { alertas: "1" } : {}), ...next });
    if (params.get("alertas") === "0") params.delete("alertas");
    return `/margenes?${params}`;
  };

  return (
    <>
      <PageHeader
        title="Márgenes"
        description="Rentabilidad por producto con costo promedio ponderado de todas tus compras. Toca un encabezado para ordenar."
      >
        <Link
          href={href({ alertas: soloAlertas ? "0" : "1" })}
          scroll={false}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors",
            soloAlertas ? "border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-400" : "hover:bg-muted",
          )}
        >
          <AlertTriangleIcon className="size-4 text-amber-500" />
          Margen &lt; {UMBRAL}%
          <Badge variant="secondary">{alertas ?? 0}</Badge>
        </Link>
      </PageHeader>

      {(alertas ?? 0) > 0 && !soloAlertas && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <p>
            <strong>{alertas} productos</strong> tienen un margen menor al {UMBRAL}%. Revisa su precio de venta o cámbialos a un
            proveedor más barato en el{" "}
            <Link href="/benchmark" className="font-medium underline underline-offset-2">
              benchmark
            </Link>
            .
          </p>
        </div>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={BadgePercentIcon}
          title={soloAlertas ? "Ningún producto con margen bajo" : "Sin productos"}
          description={soloAlertas ? "Todos tus productos superan el umbral." : "Registra productos, compras y ventas."}
        />
      ) : (
        <Card className="py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {COLUMNS.map((c, i) => {
                    const active = orden === c.key;
                    const Icon = active ? (dir === "asc" ? ArrowUpIcon : ArrowDownIcon) : ArrowUpDownIcon;
                    return (
                      <TableHead
                        key={c.key}
                        className={cn(c.align === "right" && "text-right", "className" in c && c.className, i === 0 && "pl-4", i === COLUMNS.length - 1 && "pr-4")}
                        aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : undefined}
                      >
                        <Link
                          href={href({ orden: c.key, dir: active && dir === "asc" ? "desc" : "asc" })}
                          scroll={false}
                          className={cn("inline-flex items-center gap-1 hover:text-foreground", active && "text-foreground")}
                        >
                          {c.label}
                          <Icon className={cn("size-3", !active && "opacity-40")} />
                        </Link>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const bajo = r.margen_pct !== null && Number(r.margen_pct) < UMBRAL;
                  const negativo = r.margen_pct !== null && Number(r.margen_pct) < 0;
                  return (
                    <TableRow key={r.product_id} className={cn(bajo && "bg-amber-500/5")}>
                      <TableCell className="pl-4">
                        <p className="font-medium">{r.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.categoria} · {r.unidad}
                        </p>
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums md:table-cell">
                        {r.costo_promedio === null ? "—" : formatMXN(r.costo_promedio)}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums md:table-cell">
                        {r.precio_promedio === null ? "—" : formatMXN(r.precio_promedio)}
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums lg:table-cell">
                        {r.margen === null ? "—" : formatMXN(r.margen)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 font-medium tabular-nums",
                            negativo ? "text-destructive" : bajo ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400",
                          )}
                        >
                          {bajo && <AlertTriangleIcon className="size-3.5" aria-label="Margen bajo" />}
                          {formatPct(r.margen_pct)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums sm:table-cell">{formatNumber(r.unidades_vendidas)}</TableCell>
                      <TableCell className={cn("pr-4 text-right font-medium tabular-nums", Number(r.utilidad_total) < 0 && "text-destructive")}>
                        {r.utilidad_total === null ? "—" : formatMXN(r.utilidad_total)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
