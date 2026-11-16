import { purchaseCsvSchema, saleCsvSchema } from "@/lib/validations";

export type CsvKind = "compras" | "ventas";

export const TEMPLATES: Record<CsvKind, { headers: string[]; example: string[][] }> = {
  compras: {
    headers: ["fecha", "producto", "proveedor", "cantidad", "costo_unitario"],
    example: [
      ["2026-11-01", "Café de grano 1 kg", "Abastos del Centro", "12", "215.50"],
      ["2026-11-03", "Leche entera 1 L", "Mayoreo Tapatío", "150", "19.80"],
    ],
  },
  ventas: {
    headers: ["fecha", "producto", "cantidad", "precio_unitario", "canal"],
    example: [
      ["2026-11-02", "Café de grano 1 kg", "3", "329.00", "tienda"],
      ["2026-11-04", "Leche entera 1 L", "40", "26.50", "mayoreo"],
    ],
  },
};

const ALIASES: Record<string, string> = {
  costo: "costo_unitario",
  costo_unit: "costo_unitario",
  precio: "precio_unitario",
  precio_unit: "precio_unitario",
  qty: "cantidad",
  date: "fecha",
  product: "producto",
  supplier: "proveedor",
  channel: "canal",
};

/** "Costo Unitario" → "costo_unitario" (sin acentos ni espacios) */
export function normalizeHeader(h: string): string {
  const key = h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return ALIASES[key] ?? key;
}

/** "$1,234.50" → "1234.50" */
function normalizeNumber(v: string) {
  return v.replace(/[$\s]/g, "").replace(/,/g, "");
}

/** Acepta AAAA-MM-DD o DD/MM/AAAA */
function normalizeDate(v: string) {
  const s = v.trim();
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return s;
}

export type ParsedRow<T> = { line: number; ok: true; data: T } | { line: number; ok: false; error: string; raw: Record<string, string> };

export function validateRows(kind: CsvKind, rows: Record<string, string>[]) {
  const schema = kind === "compras" ? purchaseCsvSchema : saleCsvSchema;
  return rows.map((raw, i) => {
    const input: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) input[normalizeHeader(k)] = (v ?? "").toString();
    if (input.fecha) input.fecha = normalizeDate(input.fecha);
    for (const k of ["cantidad", "costo_unitario", "precio_unitario"]) if (input[k]) input[k] = normalizeNumber(input[k]);

    const parsed = schema.safeParse(input);
    // línea 1 = encabezados
    if (parsed.success) return { line: i + 2, ok: true as const, data: parsed.data };
    const issue = parsed.error.issues[0];
    return {
      line: i + 2,
      ok: false as const,
      error: `${issue.path.join(".") || "fila"}: ${issue.message}`,
      raw: input,
    };
  });
}

export function templateCsv(kind: CsvKind) {
  const t = TEMPLATES[kind];
  return [t.headers.join(","), ...t.example.map((r) => r.map((c) => (/[",]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(","))].join("\n");
}
