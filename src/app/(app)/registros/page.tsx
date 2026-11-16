import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { requireUser } from "@/lib/auth";
import { resolveRange } from "@/lib/range";
import { createClient } from "@/lib/supabase/server";
import type { Purchase, Sale } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CatalogView } from "./catalog-view";
import { TransactionsView } from "./transactions-view";

export const metadata: Metadata = { title: "Registros" };

const PAGE_SIZE = 20;
const TABS = [
  { key: "compras", label: "Compras" },
  { key: "ventas", label: "Ventas" },
  { key: "productos", label: "Productos" },
  { key: "proveedores", label: "Proveedores" },
] as const;
type Tab = (typeof TABS)[number]["key"];

export default async function RegistrosPage({ searchParams }: PageProps<"/registros">) {
  await requireUser();
  const sp = await searchParams;
  const tab: Tab = TABS.some((t) => t.key === sp.tab) ? (sp.tab as Tab) : "compras";
  const supabase = await createClient();

  const [{ data: products }, { data: suppliers }] = await Promise.all([
    supabase.from("cv_products").select("id, nombre, categoria, unidad").order("nombre"),
    supabase.from("cv_suppliers").select("id, nombre, ciudad").order("nombre"),
  ]);

  let content: React.ReactNode;

  if (tab === "compras" || tab === "ventas") {
    const range = resolveRange(sp, 90);
    const producto = typeof sp.producto === "string" ? sp.producto : "";
    const page = Math.max(1, Number.parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);
    const table = tab === "compras" ? "cv_purchases" : "cv_sales";
    const select =
      tab === "compras"
        ? "id, product_id, supplier_id, cantidad, costo_unitario, fecha, product:cv_products(nombre, unidad), supplier:cv_suppliers(nombre)"
        : "id, product_id, cantidad, precio_unitario, canal, fecha, product:cv_products(nombre, unidad)";

    let query = supabase
      .from(table)
      .select(select, { count: "exact" })
      .gte("fecha", range.desde)
      .lte("fecha", range.hasta)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    if (producto) query = query.eq("product_id", producto);
    const { data, count, error } = await query;
    if (error) throw new Error(error.message);

    content = (
      <TransactionsView
        kind={tab}
        rows={(data ?? []) as unknown as (Purchase | Sale)[]}
        total={count ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        range={{ desde: range.desde, hasta: range.hasta, today: range.today }}
        producto={producto}
        products={products ?? []}
        suppliers={suppliers ?? []}
      />
    );
  } else {
    const items = tab === "productos" ? (products ?? []) : (suppliers ?? []);
    content = <CatalogView kind={tab} items={items} />;
  }

  return (
    <>
      <PageHeader title="Registros" description="Captura, edita o elimina compras, ventas y tu catálogo." />
      <nav className="mb-4 flex gap-1 overflow-x-auto border-b" aria-label="Secciones">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/registros?tab=${t.key}`}
            scroll={false}
            aria-current={tab === t.key ? "page" : undefined}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === t.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {content}
    </>
  );
}
