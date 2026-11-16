import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = { id: string; email: string; nombre: string };

export const getUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const email = (claims.email as string | undefined) ?? "";
  const local = email.split("@")[0] || "Usuario";
  return { id: claims.sub, email, nombre: local.charAt(0).toUpperCase() + local.slice(1) };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export async function authorize(): Promise<{ ok: true; user: SessionUser } | { ok: false; error: string }> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Tu sesión expiró, vuelve a iniciar sesión" };
  return { ok: true, user };
}

export function dbError(error: { code?: string; message: string }): string {
  if (error.code === "23505") return "Ya existe un registro con ese nombre";
  if (error.code === "23503") return "No se puede borrar: tiene registros relacionados";
  if (error.code === "42501") return "No tienes permisos para esta acción";
  if (error.code === "P0001") return error.message;
  return error.message || "Ocurrió un error inesperado";
}
