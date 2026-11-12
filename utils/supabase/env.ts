/**
 * Lee las variables públicas de Supabase.
 * Acepta la clave nueva ("publishable", sb_publishable_...) o la clásica "anon".
 * Ambas son públicas por diseño: la seguridad real la aplica RLS en la base de datos.
 */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? { url, key } : null;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv() !== null;
}

/** Versión estricta para el panel de admin: sin Supabase no hay login posible. */
export function requireSupabaseEnv() {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local (ver SUPABASE.md).",
    );
  }
  return env;
}
