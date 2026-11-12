import "server-only";

import type { CustomerRow } from "@/types/database";
import { isSupabaseConfigured } from "@/utils/supabase/env";
import { createClient } from "@/utils/supabase/server";

export type CustomerSession =
  | { status: "unconfigured" }
  | { status: "anonymous" }
  | { status: "customer"; userId: string; email: string | null; profile: CustomerRow | null };

/**
 * Sesión del cliente (Data Access Layer).
 * Valida el JWT con getClaims() y lee SU perfil; RLS impide leer el de otro.
 */
export async function getCustomerSession(): Promise<CustomerSession> {
  if (!isSupabaseConfigured()) return { status: "unconfigured" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return { status: "anonymous" };

  const { data: profile, error: profileError } = await supabase
    .from("customers")
    .select("*")
    .eq("id", claims.sub)
    .maybeSingle();
  if (profileError) console.error("[customer] No se pudo leer el perfil:", profileError.message);

  return {
    status: "customer",
    userId: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    profile: profile ?? null,
  };
}

/** Acepta solo rutas internas para el parámetro ?next= (evita redirecciones abiertas). */
export function safeNextPath(value: unknown, fallback = "/cuenta"): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")
    ? value
    : fallback;
}
