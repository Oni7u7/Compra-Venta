"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { authorize, dbError } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { purchaseCsvSchema, saleCsvSchema, type PurchaseCsvRow, type SaleCsvRow } from "@/lib/validations";

const MAX_ROWS = 2000;
const key = (s: string) => s.trim().toLowerCase();

export async function importRows(
  kind: "compras" | "ventas",
  rows: unknown[],
): Promise<ActionResult<{ inserted: number; newProducts: number; newSuppliers: number }>> {
  const auth = await authorize();
  if (!auth.ok) return auth;
  if (!Array.isArray(rows) || rows.length === 0) return { ok: false, error: "No hay filas para importar" };
  if (rows.length > MAX_ROWS) return { ok: false, error: `Máximo ${MAX_ROWS} filas por archivo` };

  // Nunca confiar en la validación del navegador: se vuelve a validar aquí.
  const schema = kind === "compras" ? z.array(purchaseCsvSchema) : z.array(saleCsvSchema);
  const parsed = schema.safeParse(rows);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: `Fila ${Number(issue.path[0]) + 2}: ${issue.message}` };
  }
  const data = parsed.data as (PurchaseCsvRow | SaleCsvRow)[];

  const supabase = await createClient();

  // 1) Productos: crear los que no existan (se identifican por nombre, sin importar mayúsculas)
  const { data: existingProducts, error: pErr } = await supabase.from("cv_products").select("id, nombre");
  if (pErr) return { ok: false, error: dbError(pErr) };
  const productIds = new Map(existingProducts.map((p) => [key(p.nombre), p.id as string]));
  const missingProducts = [...new Map(data.filter((r) => !productIds.has(key(r.producto))).map((r) => [key(r.producto), r.producto])).values()];
  if (missingProducts.length) {
    const { data: created, error } = await supabase
      .from("cv_products")
      .insert(missingProducts.map((nombre) => ({ nombre, categoria: "Importado", unidad: "pza" })))
      .select("id, nombre");
    if (error) return { ok: false, error: dbError(error) };
    created.forEach((p) => productIds.set(key(p.nombre), p.id));
  }

  // 2) Proveedores (solo compras)
  const supplierIds = new Map<string, string>();
  let missingSuppliers: string[] = [];
  if (kind === "compras") {
    const { data: existing, error } = await supabase.from("cv_suppliers").select("id, nombre");
    if (error) return { ok: false, error: dbError(error) };
    existing.forEach((s) => supplierIds.set(key(s.nombre), s.id));
    missingSuppliers = [
      ...new Map(
        (data as PurchaseCsvRow[]).filter((r) => !supplierIds.has(key(r.proveedor))).map((r) => [key(r.proveedor), r.proveedor]),
      ).values(),
    ];
    if (missingSuppliers.length) {
      const { data: created, error: sErr } = await supabase
        .from("cv_suppliers")
        .insert(missingSuppliers.map((nombre) => ({ nombre })))
        .select("id, nombre");
      if (sErr) return { ok: false, error: dbError(sErr) };
      created.forEach((s) => supplierIds.set(key(s.nombre), s.id));
    }
  }

  // 3) Inserción en bloque
  const { error } =
    kind === "compras"
      ? await supabase.from("cv_purchases").insert(
          (data as PurchaseCsvRow[]).map((r) => ({
            product_id: productIds.get(key(r.producto))!,
            supplier_id: supplierIds.get(key(r.proveedor))!,
            cantidad: r.cantidad,
            costo_unitario: r.costo_unitario,
            fecha: r.fecha,
          })),
        )
      : await supabase.from("cv_sales").insert(
          (data as SaleCsvRow[]).map((r) => ({
            product_id: productIds.get(key(r.producto))!,
            cantidad: r.cantidad,
            precio_unitario: r.precio_unitario,
            canal: r.canal,
            fecha: r.fecha,
          })),
        );
  if (error) return { ok: false, error: dbError(error) };

  for (const p of ["/", "/registros", "/benchmark", "/margenes"]) revalidatePath(p);
  return {
    ok: true,
    message: `${data.length} ${kind} importadas`,
    data: { inserted: data.length, newProducts: missingProducts.length, newSuppliers: missingSuppliers.length },
  };
}
