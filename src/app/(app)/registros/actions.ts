"use server";

import { revalidatePath } from "next/cache";
import { authorize, dbError } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import {
  fieldErrors,
  productSchema,
  purchaseSchema,
  saleSchema,
  supplierSchema,
  type PurchaseInput,
  type SaleInput,
} from "@/lib/validations";

type Table = "cv_purchases" | "cv_sales" | "cv_products" | "cv_suppliers";

function revalidateAll() {
  for (const p of ["/", "/registros", "/benchmark", "/margenes"]) revalidatePath(p);
}

async function save(
  table: Table,
  id: string | null,
  values: Record<string, unknown>,
  label: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  // user_id lo pone la BD (default auth.uid()) y RLS impide tocar filas ajenas.
  const { error } = id
    ? await supabase.from(table).update(values).eq("id", id)
    : await supabase.from(table).insert(values);
  if (error) return { ok: false, error: dbError(error) };
  revalidateAll();
  return { ok: true, message: id ? `${label} actualizado` : `${label} registrado` };
}

export async function savePurchase(id: string | null, input: PurchaseInput): Promise<ActionResult> {
  const auth = await authorize();
  if (!auth.ok) return auth;
  const parsed = purchaseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa el formulario", fields: fieldErrors(parsed.error) };
  return save("cv_purchases", id, parsed.data, "Compra");
}

export async function saveSale(id: string | null, input: SaleInput): Promise<ActionResult> {
  const auth = await authorize();
  if (!auth.ok) return auth;
  const parsed = saleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa el formulario", fields: fieldErrors(parsed.error) };
  return save("cv_sales", id, parsed.data, "Venta");
}

export async function saveProduct(
  id: string | null,
  input: { nombre: string; categoria: string; unidad: string },
): Promise<ActionResult> {
  const auth = await authorize();
  if (!auth.ok) return auth;
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa el formulario", fields: fieldErrors(parsed.error) };
  return save("cv_products", id, parsed.data, "Producto");
}

export async function saveSupplier(id: string | null, input: { nombre: string; ciudad: string }): Promise<ActionResult> {
  const auth = await authorize();
  if (!auth.ok) return auth;
  const parsed = supplierSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Revisa el formulario", fields: fieldErrors(parsed.error) };
  return save("cv_suppliers", id, parsed.data, "Proveedor");
}

const DELETE_LABEL: Record<Table, string> = {
  cv_purchases: "Compra eliminada",
  cv_sales: "Venta eliminada",
  cv_products: "Producto eliminado junto con sus compras y ventas",
  cv_suppliers: "Proveedor eliminado junto con sus compras",
};

export async function deleteRecord(table: Table, id: string): Promise<ActionResult> {
  const auth = await authorize();
  if (!auth.ok) return auth;
  if (!(table in DELETE_LABEL)) return { ok: false, error: "Tabla inválida" };
  const supabase = await createClient();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return { ok: false, error: dbError(error) };
  revalidateAll();
  return { ok: true, message: DELETE_LABEL[table] };
}
