"use client";

import { useState, useTransition } from "react";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "../actions";

export const DEMO = { email: "demo@portfolio.dev", password: "Demo1234!" };

export function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"form" | "demo" | null>(null);

  function submit(creds: { email: string; password: string }, which: "form" | "demo") {
    setMode(which);
    startTransition(async () => {
      const res = await signIn({ ...creds, next });
      if (res?.error) toast.error(res.error);
    });
  }

  return (
    <div className="grid gap-4">
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit({ email, password }, "form");
        }}
      >
        <div className="grid gap-2">
          <Label htmlFor="email">Correo</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Button type="submit" size="lg" className="h-10" disabled={pending}>
          {pending && mode === "form" && <Loader2Icon className="animate-spin" />}
          Iniciar sesión
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />o<span className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-10"
        disabled={pending}
        onClick={() => submit(DEMO, "demo")}
      >
        {pending && mode === "demo" ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
        Entrar como demo
      </Button>
    </div>
  );
}
