"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { NativeSelect } from "@/components/field";
import type { Option } from "@/lib/types";

export function ProductPicker({ value, options }: { value: string; options: Option[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-2 sm:w-72">
      <NativeSelect
        aria-label="Elegir producto"
        className="h-9"
        value={value}
        onChange={(e) => startTransition(() => router.replace(`${pathname}?producto=${e.target.value}`, { scroll: false }))}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nombre}
          </option>
        ))}
      </NativeSelect>
      {pending && <Loader2Icon className="size-4 shrink-0 animate-spin text-muted-foreground" />}
    </div>
  );
}
