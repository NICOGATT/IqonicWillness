import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { getSupabaseEnv } from "@/utils/supabase/env";

/**
 * Cliente anónimo y SIN cookies para lecturas públicas (catálogo).
 * Al no depender de la petición, se puede usar dentro de "use cache":
 * la página pública queda prerenderizada y rapidísima.
 * RLS solo le deja leer productos activos.
 */
export function createPublicClient() {
  const env = getSupabaseEnv();
  if (!env) return null;
  return createSupabaseClient<Database>(env.url, env.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
