"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { shiftDays } from "@/lib/format";
import { cn } from "@/lib/utils";

const PRESETS = [
  { label: "30 días", days: 30 },
  { label: "90 días", days: 90 },
  { label: "6 meses", days: 182 },
  { label: "1 año", days: 365 },
];

export function DateRangeFilter({ desde, hasta, today }: { desde: string; hasta: string; today: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function apply(next: { desde: string; hasta: string }) {
    if (!next.desde || !next.hasta || next.desde > next.hasta) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("desde", next.desde);
    params.set("hasta", next.hasta);
    startTransition(() => router.replace(`${pathname}?${params}`, { scroll: false }));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-lg border p-0.5">
        {PRESETS.map((p) => {
          const from = shiftDays(today, -p.days + 1);
          const active = hasta === today && desde === from;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => apply({ desde: from, hasta: today })}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          aria-label="Desde"
          className="h-8 w-[9.5rem]"
          value={desde}
          max={hasta}
          onChange={(e) => apply({ desde: e.target.value, hasta })}
        />
        <span className="text-xs text-muted-foreground">a</span>
        <Input
          type="date"
          aria-label="Hasta"
          className="h-8 w-[9.5rem]"
          value={hasta}
          min={desde}
          max={today}
          onChange={(e) => apply({ desde, hasta: e.target.value })}
        />
        {pending && <Loader2Icon className="size-4 animate-spin text-muted-foreground" />}
      </div>
    </div>
  );
}
