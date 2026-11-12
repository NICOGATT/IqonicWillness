import "server-only";

import { isSupabaseConfigured } from "@/utils/supabase/env";
import { createClient } from "@/utils/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type AdminSession =
  | { status: "unconfigured" }
  | { status: "anonymous" }
  | { status: "db-missing"; email: string | null }
  | { status: "forbidden"; email: string | null }
  | { status: "admin"; email: string | null; userId: string; supabase: SupabaseServerClient };

/**
 * Data Access Layer de autenticación.
 * Lee la sesión desde las cookies, valida el JWT (getClaims) y comprueba
 * en la base de datos si el usuario está en la tabla `admins`.
 *
 * Úsalo en cada Server Component y Server Action del panel: el proxy solo
 * hace una comprobación optimista y nunca debe ser la única barrera.
 */
export async function getAdminSession(): Promise<AdminSession> {
  if (!isSupabaseConfigured()) return { status: "unconfigured" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return { status: "anonymous" };

  const email = typeof claims.email === "string" ? claims.email : null;
  const { data: isAdmin, error: rpcError } = await supabase.rpc("is_admin");
  if (rpcError) {
    // Normalmente significa que no se ejecutó supabase/migrations/0001_products.sql
    console.error("[auth] is_admin() falló:", rpcError.message);
    return { status: "db-missing", email };
  }
  if (!isAdmin) return { status: "forbidden", email };

  return { status: "admin", email, userId: claims.sub, supabase };
}
