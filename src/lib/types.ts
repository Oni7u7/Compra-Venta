export type Canal = "tienda" | "online" | "mayoreo";

export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string; fields?: Record<string, string> };

export type Option = { id: string; nombre: string };

export type Purchase = {
  id: string;
  product_id: string;
  supplier_id: string;
  cantidad: number;
  costo_unitario: number;
  fecha: string;
  product: { nombre: string; unidad: string } | null;
  supplier: { nombre: string } | null;
};

export type Sale = {
  id: string;
  product_id: string;
  cantidad: number;
  precio_unitario: number;
  canal: Canal;
  fecha: string;
  product: { nombre: string; unidad: string } | null;
};

export type ProductMargin = {
  product_id: string;
  nombre: string;
  categoria: string;
  unidad: string;
  costo_promedio: number | null;
  precio_promedio: number | null;
  margen: number | null;
  margen_pct: number | null;
  unidades_vendidas: number;
  ingreso_total: number;
  utilidad_total: number | null;
};

export type BenchmarkRow = {
  product_id: string;
  producto: string;
  unidad: string;
  supplier_id: string;
  proveedor: string;
  ciudad: string | null;
  avg_cost: number;
  min_cost: number;
  max_cost: number;
  num_compras: number;
  unidades: number;
  gasto: number;
  ultima_compra: string;
  ranking: number;
  pct_vs_mejor: number;
  ahorro_potencial: number;
};

export const CANALES: { value: Canal; label: string }[] = [
  { value: "tienda", label: "Tienda" },
  { value: "online", label: "Online" },
  { value: "mayoreo", label: "Mayoreo" },
];
