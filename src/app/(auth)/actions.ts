"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validations";

export async function signIn(input: { email: string; password: string; next?: string }) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.message === "Invalid login credentials") {
      return { error: "Correo o contraseña incorrectos" };
    }
    if (error.name === "AuthRetryableFetchError" || error.message === "fetch failed") {
      return { error: "No se pudo conectar con Supabase. Revisa las variables de entorno." };
    }
    return { error: error.message };
  }

  const next = input.next?.startsWith("/") && !input.next.startsWith("//") ? input.next : "/";
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
