import { LogOutIcon, TrendingUpIcon } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { MobileNav } from "@/components/mobile-nav";
import { NavLinks } from "@/components/nav-links";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { requireUser, type SessionUser } from "@/lib/auth";

function UserBlock({ user }: { user: SessionUser }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {user.nombre.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{user.nombre}</p>
        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
      </div>
      <form action={signOut}>
        <Button type="submit" variant="ghost" size="icon" aria-label="Cerrar sesión" title="Cerrar sesión">
          <LogOutIcon />
        </Button>
      </form>
    </div>
  );
}

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();

  return (
    <div className="flex min-h-svh">
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col gap-6 border-r bg-sidebar p-4 lg:flex">
        <div className="flex items-center gap-2 px-2 pt-1 font-semibold">
          <TrendingUpIcon className="size-5 text-primary" /> CompraVenta Insights
        </div>
        <NavLinks />
        <div className="mt-auto border-t pt-4">
          <UserBlock user={user} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur lg:px-6">
          <MobileNav />
          <span className="font-semibold lg:hidden">CompraVenta Insights</span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 p-4 pb-10 lg:p-6">{children}</main>
        <div className="border-t p-4 lg:hidden">
          <UserBlock user={user} />
        </div>
      </div>
    </div>
  );
}
