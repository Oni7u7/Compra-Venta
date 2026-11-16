const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const num = new Intl.NumberFormat("es-MX");
const dateTime = new Intl.DateTimeFormat("es-MX", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Mexico_City",
});
const shortDate = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});

export const formatMXN = (value: number | string | null | undefined) => mxn.format(Number(value ?? 0));
export const formatNumber = (value: number | string | null | undefined) => num.format(Number(value ?? 0));
export const formatDateTime = (value: string | Date) => dateTime.format(new Date(value));
/** Para fechas "YYYY-MM-DD" (sin hora) */
export const formatShortDate = (value: string) => shortDate.format(new Date(`${value}T00:00:00Z`));

const pct = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const monthFmt = new Intl.DateTimeFormat("es-MX", { month: "short", year: "2-digit", timeZone: "UTC" });
const dateFmt = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

export const formatPct = (value: number | string | null | undefined) =>
  value === null || value === undefined ? "—" : `${pct.format(Number(value))}%`;
/** "2026-11-01" → "nov 26" */
export const formatMonth = (value: string) => monthFmt.format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
/** "2026-11-15" → "15 nov 2026" */
export const formatDate = (value: string) => dateFmt.format(new Date(`${value.slice(0, 10)}T00:00:00Z`));

/** Fecha de hoy en CDMX como YYYY-MM-DD */
export function todayMX(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
}

export function shiftDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
