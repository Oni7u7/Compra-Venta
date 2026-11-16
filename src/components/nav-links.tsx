"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgePercentIcon, FileUpIcon, LayoutDashboardIcon, ListIcon, TrophyIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/benchmark", label: "Benchmark proveedores", icon: TrophyIcon },
  { href: "/margenes", label: "Márgenes", icon: BadgePercentIcon },
  { href: "/registros", label: "Registros", icon: ListIcon },
  { href: "/importar", label: "Importar CSV", icon: FileUpIcon },
];

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="grid gap-1">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              active && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
