import type { Metadata } from "next";
import Link from "next/link";
import { CrownIcon, PiggyBankIcon, TrophyIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { formatDate, formatMXN, formatNumber, formatPct } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { BenchmarkRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ProductPicker } from "./product-picker";

export const metadata: Metadata = { title: "Benchmark de proveedores" };

type Summary = {
  product_id: string;
  producto: string;
  unidad: string;
  mejor: BenchmarkRow;
  peor: BenchmarkRow;
  proveedores: number;
  ahorro: number;
};

export default async function BenchmarkPage({ searchParams }: PageProps<"/benchmark">) {
  await requireUser();
  const sp = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cv_supplier_benchmark")
    .select("*")
    .order("producto")
    .order("ranking");
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as BenchmarkRow[];
  if (rows.length === 0) {
    return (
      <>
        <PageHeader title="Benchmark de proveedores" description="Compara cuánto te cobra cada proveedor por el mismo producto." />
        <EmptyState icon={TrophyIcon} title="Aún no hay compras" description="Registra o importa compras para comparar proveedores.">
          <Link href="/importar" className={buttonVariants()}>
            Importar CSV
          </Link>
        </EmptyState>
      </>
    );
  }

  // Resumen por producto (agrupación de filas ya calculadas por la vista)
  const byProduct = new Map<string, BenchmarkRow[]>();
  for (const r of rows) byProduct.set(r.product_id, [...(byProduct.get(r.product_id) ?? []), r]);
  const summaries: Summary[] = [...byProduct.values()]
    .map((list) => ({
      product_id: list[0].product_id,
      producto: list[0].producto,
      unidad: list[0].unidad,
      mejor: list[0],
      peor: list[list.length - 1],
      proveedores: list.length,
      ahorro: list.reduce((acc, r) => acc + Number(r.ahorro_potencial), 0),
    }))
    .sort((a, b) => b.ahorro - a.ahorro);

  const totalAhorro = summaries.reduce((acc, s) => acc + s.ahorro, 0);
  const totalGasto = rows.reduce((acc, r) => acc + Number(r.gasto), 0);

  const requested = typeof sp.producto === "string" ? sp.producto : "";
  const selectedId = byProduct.has(requested) ? requested : summaries[0].product_id;
  const detail = byProduct.get(selectedId) ?? [];
  const selected = summaries.find((s) => s.product_id === selectedId)!;
  const maxCost = Math.max(...detail.map((r) => Number(r.avg_cost)));

  return (
    <>
      <PageHeader
        title="Benchmark de proveedores"
        description="Costo promedio ponderado por proveedor, ranking y cuánto habrías ahorrado comprando siempre al más barato."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardDescription>Ahorro potencial total</CardDescription>
            <PiggyBankIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-primary tabular-nums">{formatMXN(totalAhorro)}</p>
            <p className="text-xs text-muted-foreground">{formatPct((totalAhorro / totalGasto) * 100)} de lo gastado en compras</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Gasto total en compras</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{formatMXN(totalGasto)}</p>
            <p className="text-xs text-muted-foreground">{byProduct.size} productos comparados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Mayor oportunidad</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="truncate text-lg font-semibold">{summaries[0].producto}</p>
            <p className="text-xs text-muted-foreground">
              Ahorro de {formatMXN(summaries[0].ahorro)} con {summaries[0].mejor.proveedor}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Comparativa por producto</CardTitle>
            <CardDescription>
              {selected.proveedores} proveedores · el más barato cuesta {formatPct(Number(selected.peor.pct_vs_mejor))} menos
              que el más caro
            </CardDescription>
          </div>
          <ProductPicker
            value={selectedId}
            options={summaries.map((s) => ({ id: s.product_id, nombre: s.producto })).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))}
          />
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 pl-6">#</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead className="min-w-40">Costo promedio / {selected.unidad}</TableHead>
                <TableHead className="hidden text-right md:table-cell">Mín – Máx</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Compras</TableHead>
                <TableHead className="text-right">vs. mejor</TableHead>
                <TableHead className="pr-6 text-right">Ahorro potencial</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.map((r) => {
                const best = r.ranking === 1;
                return (
                  <TableRow key={r.supplier_id} className={cn(best && "bg-primary/5 hover:bg-primary/10")}>
                    <TableCell className="pl-6 font-semibold tabular-nums">
                      {best ? <CrownIcon className="size-4 text-amber-500" aria-label="Mejor precio" /> : r.ranking}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{r.proveedor}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.ciudad ?? "—"} · última compra {formatDate(r.ultima_compra)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={cn("w-20 shrink-0 font-medium tabular-nums", best && "text-primary")}>
                          {formatMXN(r.avg_cost)}
                        </span>
                        <div className="hidden h-2 flex-1 overflow-hidden rounded-full bg-muted sm:block">
                          <div
                            className={cn("h-full rounded-full", best ? "bg-primary" : "bg-muted-foreground/40")}
                            style={{ width: `${(Number(r.avg_cost) / maxCost) * 100}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-right text-xs text-muted-foreground tabular-nums md:table-cell">
                      {formatMXN(r.min_cost)} – {formatMXN(r.max_cost)}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">
                      {r.num_compras} <span className="text-xs text-muted-foreground">({formatNumber(r.unidades)} {selected.unidad})</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {best ? (
                        <Badge>Mejor precio</Badge>
                      ) : (
                        <span className="text-rose-600 tabular-nums dark:text-rose-400">+{formatPct(r.pct_vs_mejor)}</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-6 text-right font-medium tabular-nums">
                      {best ? "—" : formatMXN(r.ahorro_potencial)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <p className="px-6 pt-3 text-xs text-muted-foreground">
            Ahorro potencial = unidades compradas a ese proveedor × (su costo promedio − costo promedio del más barato).
          </p>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Mejor proveedor por producto</CardTitle>
          <CardDescription>Ordenado por ahorro potencial</CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Producto</TableHead>
                <TableHead>Mejor proveedor</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Mejor costo</TableHead>
                <TableHead className="hidden text-right md:table-cell">Más caro</TableHead>
                <TableHead className="pr-6 text-right">Ahorro potencial</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.map((s) => (
                <TableRow key={s.product_id}>
                  <TableCell className="pl-6">
                    <Link href={`/benchmark?producto=${s.product_id}`} scroll={false} className="font-medium hover:text-primary hover:underline">
                      {s.producto}
                    </Link>
                  </TableCell>
                  <TableCell>{s.mejor.proveedor}</TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">{formatMXN(s.mejor.avg_cost)}</TableCell>
                  <TableCell className="hidden text-right text-muted-foreground tabular-nums md:table-cell">
                    {formatMXN(s.peor.avg_cost)} <span className="text-xs">({s.peor.proveedor})</span>
                  </TableCell>
                  <TableCell className="pr-6 text-right font-medium tabular-nums">{formatMXN(s.ahorro)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
