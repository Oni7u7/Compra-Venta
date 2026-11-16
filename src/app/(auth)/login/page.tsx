import type { Metadata } from "next";
import { ArrowDownUpIcon, BadgePercentIcon, FileSpreadsheetIcon, TrendingUpIcon, TrophyIcon } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

const features = [
  { icon: TrophyIcon, text: "Ranking de proveedores: quién te vende más barato cada producto" },
  { icon: BadgePercentIcon, text: "Margen y utilidad real por producto, con alertas de margen bajo" },
  { icon: ArrowDownUpIcon, text: "Ventas vs compras por mes y ventas por canal" },
  { icon: FileSpreadsheetIcon, text: "Importa tus compras y ventas desde CSV" },
];

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;

  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-white/10 blur-3xl"
        />
        <div className="flex items-center gap-2 text-lg font-semibold">
          <TrendingUpIcon className="size-6" /> CompraVenta Insights
        </div>
        <div className="relative max-w-md space-y-6">
          <h2 className="text-3xl leading-tight font-semibold text-balance">
            Descubre dónde ganas, dónde pierdes y a quién conviene comprarle.
          </h2>
          <ul className="space-y-3">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm/6 opacity-90">
                <Icon className="mt-0.5 size-4 shrink-0" /> {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs opacity-70">Proyecto de portfolio · Next.js 16 + Supabase</p>
      </section>

      <section className="flex flex-col p-4 sm:p-6">
        <div className="flex justify-between lg:justify-end">
          <div className="flex items-center gap-2 font-semibold lg:hidden">
            <TrendingUpIcon className="size-5 text-primary" /> CompraVenta Insights
          </div>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm space-y-6">
            <div className="space-y-1.5">
              <h1 className="text-2xl font-semibold tracking-tight">Bienvenido</h1>
              <p className="text-sm text-muted-foreground">
                Entra con tu cuenta o prueba la app con el usuario demo.
              </p>
            </div>
            <LoginForm next={typeof next === "string" ? next : undefined} />
            <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              Demo: <span className="font-mono">demo@portfolio.dev</span> /{" "}
              <span className="font-mono">Demo1234!</span>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
