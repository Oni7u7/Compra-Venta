"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon, Loader2Icon, PencilIcon, PlusIcon, ReceiptIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DateRangeFilter } from "@/components/date-range-filter";
import { EmptyState } from "@/components/empty-state";
import { Field, NativeSelect } from "@/components/field";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatMXN, formatNumber, todayMX } from "@/lib/format";
import { CANALES, type Option, type Purchase, type Sale } from "@/lib/types";
import { cn } from "@/lib/utils";
import { deleteRecord, savePurchase, saveSale } from "./actions";

type Kind = "compras" | "ventas";
type Row = Purchase | Sale;

const isPurchase = (r: Row): r is Purchase => "costo_unitario" in r;

export function TransactionsView({
  kind,
  rows,
  total,
  page,
  pageSize,
  range,
  producto,
  products,
  suppliers,
}: {
  kind: Kind;
  rows: Row[];
  total: number;
  page: number;
  pageSize: number;
  range: { desde: string; hasta: string; today: string };
  producto: string;
  products: (Option & { unidad: string })[];
  suppliers: Option[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [navigating, startNav] = useTransition();
  const [deleting, startDelete] = useTransition();
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [toDelete, setToDelete] = useState<Row | null>(null);

  const label = kind === "compras" ? "compra" : "venta";
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageTotal = rows.reduce(
    (acc, r) => acc + Number(r.cantidad) * Number(isPurchase(r) ? r.costo_unitario : r.precio_unitario),
    0,
  );

  function url(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", kind);
    for (const [k, v] of Object.entries(next)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    return `${pathname}?${params}`;
  }

  function confirmDelete() {
    if (!toDelete) return;
    startDelete(async () => {
      const res = await deleteRecord(kind === "compras" ? "cv_purchases" : "cv_sales", toDelete.id);
      if (res.ok) toast.success(res.message);
      else toast.error(res.error);
      setToDelete(null);
    });
  }

  const noCatalog = products.length === 0 || (kind === "compras" && suppliers.length === 0);

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <DateRangeFilter desde={range.desde} hasta={range.hasta} today={range.today} />
          <NativeSelect
            aria-label="Filtrar por producto"
            className="h-8 md:w-56"
            value={producto}
            onChange={(e) => startNav(() => router.replace(url({ producto: e.target.value, page: "" }), { scroll: false }))}
          >
            <option value="">Todos los productos</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button size="lg" onClick={() => setEditing("new")} disabled={noCatalog}>
          <PlusIcon /> Nueva {label}
        </Button>
      </div>

      {noCatalog && (
        <p className="mb-4 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          Primero da de alta productos{kind === "compras" ? " y proveedores" : ""} en sus pestañas.
        </p>
      )}

      {rows.length === 0 ? (
        <EmptyState icon={ReceiptIcon} title={`Sin ${kind} en este periodo`} description="Cambia el rango de fechas o captura un registro." />
      ) : (
        <Card className={cn("py-0 transition-opacity", navigating && "opacity-60")}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Fecha</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="hidden md:table-cell">{kind === "compras" ? "Proveedor" : "Canal"}</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Cantidad</TableHead>
                <TableHead className="hidden text-right sm:table-cell">{kind === "compras" ? "Costo unit." : "Precio unit."}</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-20 pr-4 text-right">
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const unit = Number(isPurchase(r) ? r.costo_unitario : r.precio_unitario);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="pl-4 text-xs whitespace-nowrap text-muted-foreground">{formatDate(r.fecha)}</TableCell>
                    <TableCell>
                      <p className="max-w-[14rem] truncate font-medium">{r.product?.nombre}</p>
                      <p className="text-xs text-muted-foreground sm:hidden">
                        {formatNumber(r.cantidad)} × {formatMXN(unit)}
                      </p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {isPurchase(r) ? (
                        r.supplier?.nombre
                      ) : (
                        <Badge variant="outline" className="capitalize">
                          {r.canal}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">
                      {formatNumber(r.cantidad)} <span className="text-xs text-muted-foreground">{r.product?.unidad}</span>
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">{formatMXN(unit)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatMXN(Number(r.cantidad) * unit)}</TableCell>
                    <TableCell className="pr-4 text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon-sm" aria-label="Editar" onClick={() => setEditing(r)}>
                        <PencilIcon />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Eliminar" onClick={() => setToDelete(r)}>
                        <Trash2Icon className="text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-sm text-muted-foreground">
            <span>
              {total} registros · esta página suma <strong className="text-foreground">{formatMXN(pageTotal)}</strong>
            </span>
            <div className="flex items-center gap-1">
              <Link
                href={url({ page: String(page - 1) })}
                scroll={false}
                aria-label="Página anterior"
                aria-disabled={page <= 1}
                className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }), page <= 1 && "pointer-events-none opacity-50")}
              >
                <ChevronLeftIcon />
              </Link>
              <span className="px-2 tabular-nums">
                {page} / {totalPages}
              </span>
              <Link
                href={url({ page: String(page + 1) })}
                scroll={false}
                aria-label="Página siguiente"
                aria-disabled={page >= totalPages}
                className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }), page >= totalPages && "pointer-events-none opacity-50")}
              >
                <ChevronRightIcon />
              </Link>
            </div>
          </div>
        </Card>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          {editing && (
            <TransactionForm
              key={editing === "new" ? "new" : editing.id}
              kind={kind}
              row={editing}
              products={products}
              suppliers={suppliers}
              onDone={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`¿Eliminar esta ${label}?`}
        description={toDelete ? `${toDelete.product?.nombre} · ${formatDate(toDelete.fecha)}. Esta acción no se puede deshacer.` : ""}
        pending={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}

function TransactionForm({
  kind,
  row,
  products,
  suppliers,
  onDone,
}: {
  kind: Kind;
  row: Row | "new";
  products: (Option & { unidad: string })[];
  suppliers: Option[];
  onDone: () => void;
}) {
  const existing = row === "new" ? null : row;
  const [form, setForm] = useState({
    product_id: existing?.product_id ?? "",
    supplier_id: existing && isPurchase(existing) ? existing.supplier_id : "",
    cantidad: existing ? String(existing.cantidad) : "",
    unit: existing ? String(isPurchase(existing) ? existing.costo_unitario : existing.precio_unitario) : "",
    canal: existing && !isPurchase(existing) ? existing.canal : "tienda",
    fecha: existing?.fecha ?? todayMX(),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const unidad = products.find((p) => p.id === form.product_id)?.unidad ?? "unidad";
  const total = (Number(form.cantidad) || 0) * (Number(form.unit) || 0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const id = existing?.id ?? null;
      const res =
        kind === "compras"
          ? await savePurchase(id, {
              product_id: form.product_id,
              supplier_id: form.supplier_id,
              cantidad: form.cantidad,
              costo_unitario: form.unit,
              fecha: form.fecha,
            })
          : await saveSale(id, {
              product_id: form.product_id,
              cantidad: form.cantidad,
              precio_unitario: form.unit,
              canal: form.canal as "tienda",
              fecha: form.fecha,
            });
      if (!res.ok) {
        const f = res.fields ?? {};
        setErrors({ ...f, unit: f.costo_unitario ?? f.precio_unitario ?? "" });
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      onDone();
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>
          {existing ? "Editar" : "Nueva"} {kind === "compras" ? "compra" : "venta"}
        </DialogTitle>
        <DialogDescription>
          {kind === "compras" ? "Lo que pagaste a un proveedor." : "Lo que vendiste y por qué canal."}
        </DialogDescription>
      </DialogHeader>

      <Field label="Producto" htmlFor="t-prod" error={errors.product_id}>
        <NativeSelect id="t-prod" value={form.product_id} onChange={set("product_id")} aria-invalid={Boolean(errors.product_id)}>
          <option value="">Elige un producto…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </NativeSelect>
      </Field>

      {kind === "compras" ? (
        <Field label="Proveedor" htmlFor="t-sup" error={errors.supplier_id}>
          <NativeSelect id="t-sup" value={form.supplier_id} onChange={set("supplier_id")} aria-invalid={Boolean(errors.supplier_id)}>
            <option value="">Elige un proveedor…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </NativeSelect>
        </Field>
      ) : (
        <Field label="Canal" htmlFor="t-canal" error={errors.canal}>
          <NativeSelect id="t-canal" value={form.canal} onChange={set("canal")}>
            {CANALES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </NativeSelect>
        </Field>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label={`Cantidad (${unidad})`} htmlFor="t-cant" error={errors.cantidad}>
          <Input id="t-cant" type="number" inputMode="decimal" min="0" step="0.01" value={form.cantidad} onChange={set("cantidad")} aria-invalid={Boolean(errors.cantidad)} />
        </Field>
        <Field label={kind === "compras" ? "Costo unitario" : "Precio unitario"} htmlFor="t-unit" error={errors.unit}>
          <Input id="t-unit" type="number" inputMode="decimal" min="0" step="0.01" value={form.unit} onChange={set("unit")} aria-invalid={Boolean(errors.unit)} />
        </Field>
      </div>

      <Field label="Fecha" htmlFor="t-fecha" error={errors.fecha}>
        <Input id="t-fecha" type="date" max={todayMX()} value={form.fecha} onChange={set("fecha")} aria-invalid={Boolean(errors.fecha)} />
      </Field>

      <div className="flex items-baseline justify-between rounded-lg bg-muted px-3 py-2 text-sm">
        <span className="text-muted-foreground">Total</span>
        <span className="text-lg font-semibold tabular-nums">{formatMXN(total)}</span>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2Icon className="animate-spin" />} Guardar
        </Button>
      </DialogFooter>
    </form>
  );
}
