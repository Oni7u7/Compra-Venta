import { z } from "zod";

const emptyToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const fecha = z
  .string({ error: "Requerido" })
  .regex(DATE_RE, "Fecha inválida (AAAA-MM-DD)")
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), "Fecha inválida")
  .refine((v) => v <= new Date(Date.now() + 86_400_000).toISOString().slice(0, 10), "La fecha no puede ser futura");

const positive = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number({ error: "Requerido" })
    .positive("Debe ser mayor a 0")
    .max(1_000_000, "Demasiado alto")
    .transform((v) => Math.round(v * 100) / 100),
);

const money = z.preprocess(
  emptyToUndefined,
  z.coerce
    .number({ error: "Requerido" })
    .min(0, "No puede ser negativo")
    .max(1_000_000, "Demasiado alto")
    .transform((v) => Math.round(v * 100) / 100),
);

export const loginSchema = z.object({
  email: z.email("Correo inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

export const productSchema = z.object({
  nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(100, "Máximo 100 caracteres"),
  categoria: z.string().trim().min(2, "Mínimo 2 caracteres").max(50, "Máximo 50 caracteres"),
  unidad: z.string().trim().min(1, "Requerido").max(15, "Máximo 15 caracteres"),
});

export const supplierSchema = z.object({
  nombre: z.string().trim().min(2, "Mínimo 2 caracteres").max(100, "Máximo 100 caracteres"),
  ciudad: z
    .string()
    .trim()
    .max(60, "Máximo 60 caracteres")
    .optional()
    .transform((v) => (v ? v : null)),
});

export const purchaseSchema = z.object({
  product_id: z.uuid("Elige un producto"),
  supplier_id: z.uuid("Elige un proveedor"),
  cantidad: positive,
  costo_unitario: money,
  fecha,
});

export const saleSchema = z.object({
  product_id: z.uuid("Elige un producto"),
  cantidad: positive,
  precio_unitario: money,
  canal: z.enum(["tienda", "online", "mayoreo"], { error: "Canal inválido" }),
  fecha,
});

// Filas de importación CSV: se identifican por NOMBRE de producto/proveedor
export const purchaseCsvSchema = z.object({
  fecha,
  producto: z.string().trim().min(2, "Producto requerido").max(100),
  proveedor: z.string().trim().min(2, "Proveedor requerido").max(100),
  cantidad: positive,
  costo_unitario: money,
});

export const saleCsvSchema = z.object({
  fecha,
  producto: z.string().trim().min(2, "Producto requerido").max(100),
  cantidad: positive,
  precio_unitario: money,
  canal: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.enum(["tienda", "online", "mayoreo"], { error: "Canal: tienda, online o mayoreo" })),
});

export const rangeSchema = z
  .object({ desde: z.string().regex(DATE_RE), hasta: z.string().regex(DATE_RE) })
  .refine((r) => r.desde <= r.hasta);

export type PurchaseInput = z.input<typeof purchaseSchema>;
export type SaleInput = z.input<typeof saleSchema>;
export type PurchaseCsvRow = z.output<typeof purchaseCsvSchema>;
export type SaleCsvRow = z.output<typeof saleCsvSchema>;

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
