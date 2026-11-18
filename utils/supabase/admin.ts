import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { getSupabaseEnv } from "@/utils/supabase/env";

/**
 * Cliente con la clave SECRETA de Supabase: salta RLS.
 * Solo para lo que ningún usuario puede hacer por sí mismo, como marcar un
 * pedido como pagado después de verificar el cobro con Stripe.
 *
 * null si falta SUPABASE_SECRET_KEY (o si por error tiene la clave publicable).
 */
export function createAdminClient() {
  const env = getSupabaseEnv();
  const key = (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
  if (!env || !key) return null;
  if (key.startsWith("sb_publishable_") || key === env.key) {
    console.error("[supabase] SUPABASE_SECRET_KEY tiene la clave publicable: usa la secreta (sb_secret_… o service_role).");
    return null;
  }
  return createSupabaseClient<Database>(env.url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
