import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ImportView } from "./import-view";

export const metadata: Metadata = { title: "Importar CSV" };

export default async function ImportarPage() {
  await requireUser();
  const supabase = await createClient();
  const [{ data: products }, { data: suppliers }] = await Promise.all([
    supabase.from("cv_products").select("nombre"),
    supabase.from("cv_suppliers").select("nombre"),
  ]);

  return (
    <>
      <PageHeader
        title="Importar CSV"
        description="Sube compras o ventas en bloque. Revisa la vista previa antes de guardar; los productos y proveedores nuevos se crean solos."
      />
      <ImportView
        existingProducts={(products ?? []).map((p) => p.nombre as string)}
        existingSuppliers={(suppliers ?? []).map((s) => s.nombre as string)}
      />
    </>
  );
}
