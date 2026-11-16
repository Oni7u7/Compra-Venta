"use client";

import { useState, useTransition } from "react";
import { BoxIcon, Loader2Icon, PencilIcon, PlusIcon, Trash2Icon, TruckIcon } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { Field } from "@/components/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteRecord, saveProduct, saveSupplier } from "./actions";

type Item = { id: string; nombre: string; categoria?: string; unidad?: string; ciudad?: string | null };
type Kind = "productos" | "proveedores";

export function CatalogView({ kind, items }: { kind: Kind; items: Item[] }) {
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [toDelete, setToDelete] = useState<Item | null>(null);
  const [deleting, startDelete] = useTransition();
  const isProduct = kind === "productos";
  const label = isProduct ? "producto" : "proveedor";

  function confirmDelete() {
    if (!toDelete) return;
    startDelete(async () => {
      const res = await deleteRecord(isProduct ? "cv_products" : "cv_suppliers", toDelete.id);
      if (res.ok) toast.success(res.message);
      else toast.error(res.error);
      setToDelete(null);
    });
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="lg" onClick={() => setEditing("new")}>
          <PlusIcon /> Nuevo {label}
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={isProduct ? BoxIcon : TruckIcon} title={`Sin ${kind}`} description={`Agrega tu primer ${label}.`} />
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Nombre</TableHead>
                {isProduct ? (
                  <>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="hidden sm:table-cell">Unidad</TableHead>
                  </>
                ) : (
                  <TableHead>Ciudad</TableHead>
                )}
                <TableHead className="w-20 pr-4 text-right">
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="pl-4 font-medium">{it.nombre}</TableCell>
                  {isProduct ? (
                    <>
                      <TableCell className="text-muted-foreground">{it.categoria}</TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">{it.unidad}</TableCell>
                    </>
                  ) : (
                    <TableCell className="text-muted-foreground">{it.ciudad ?? "—"}</TableCell>
                  )}
                  <TableCell className="pr-4 text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon-sm" aria-label={`Editar ${it.nombre}`} onClick={() => setEditing(it)}>
                      <PencilIcon />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`Eliminar ${it.nombre}`} onClick={() => setToDelete(it)}>
                      <Trash2Icon className="text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          {editing && (
            <CatalogForm key={editing === "new" ? "new" : editing.id} kind={kind} item={editing} onDone={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`¿Eliminar "${toDelete?.nombre}"?`}
        description={
          isProduct
            ? "También se borran todas sus compras y ventas. Esta acción no se puede deshacer."
            : "También se borran todas las compras hechas a este proveedor. Esta acción no se puede deshacer."
        }
        pending={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}

function CatalogForm({ kind, item, onDone }: { kind: Kind; item: Item | "new"; onDone: () => void }) {
  const existing = item === "new" ? null : item;
  const isProduct = kind === "productos";
  const [form, setForm] = useState({
    nombre: existing?.nombre ?? "",
    categoria: existing?.categoria ?? "",
    unidad: existing?.unidad ?? "pza",
    ciudad: existing?.ciudad ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const id = existing?.id ?? null;
      const res = isProduct
        ? await saveProduct(id, { nombre: form.nombre, categoria: form.categoria, unidad: form.unidad })
        : await saveSupplier(id, { nombre: form.nombre, ciudad: form.ciudad });
      if (!res.ok) {
        setErrors(res.fields ?? {});
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
          {existing ? "Editar" : "Nuevo"} {isProduct ? "producto" : "proveedor"}
        </DialogTitle>
        <DialogDescription>El nombre debe ser único en tu cuenta.</DialogDescription>
      </DialogHeader>
      <Field label="Nombre" htmlFor="c-nombre" error={errors.nombre}>
        <Input id="c-nombre" value={form.nombre} onChange={set("nombre")} aria-invalid={Boolean(errors.nombre)} autoFocus />
      </Field>
      {isProduct ? (
        <div className="grid grid-cols-2 gap-4">
          <Field label="Categoría" htmlFor="c-cat" error={errors.categoria}>
            <Input id="c-cat" value={form.categoria} onChange={set("categoria")} aria-invalid={Boolean(errors.categoria)} />
          </Field>
          <Field label="Unidad" htmlFor="c-uni" error={errors.unidad} hint="pza, kg, L, caja…">
            <Input id="c-uni" value={form.unidad} onChange={set("unidad")} aria-invalid={Boolean(errors.unidad)} />
          </Field>
        </div>
      ) : (
        <Field label="Ciudad" htmlFor="c-ciudad" error={errors.ciudad}>
          <Input id="c-ciudad" value={form.ciudad} onChange={set("ciudad")} />
        </Field>
      )}
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
