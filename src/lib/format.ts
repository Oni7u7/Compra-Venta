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
