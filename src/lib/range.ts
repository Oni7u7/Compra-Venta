import { shiftDays, todayMX } from "@/lib/format";
import { rangeSchema } from "@/lib/validations";

/** Lee ?desde=&hasta= de la URL; por defecto los últimos ~6 meses. */
export function resolveRange(sp: Record<string, string | string[] | undefined>, defaultDays = 182) {
  const today = todayMX();
  const parsed = rangeSchema.safeParse({ desde: sp.desde, hasta: sp.hasta });
  const { desde, hasta } = parsed.success
    ? parsed.data
    : { desde: shiftDays(today, -defaultDays + 1), hasta: today };

  // Periodo anterior de la misma duración, para comparar
  const days = Math.round((Date.parse(hasta) - Date.parse(desde)) / 86_400_000) + 1;
  const prevHasta = shiftDays(desde, -1);
  const prevDesde = shiftDays(prevHasta, -days + 1);

  return { today, desde, hasta, days, prevDesde, prevHasta };
}
