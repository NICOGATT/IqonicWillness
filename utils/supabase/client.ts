import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";
import { requireSupabaseEnv } from "@/utils/supabase/env";

/**
 * Cliente de Supabase para Client Components ("use client").
 * Comparte la sesión con el servidor a través de las mismas cookies.
 *
 * En esta app las escrituras van por Server Actions (más seguro y simple),
 * pero este cliente sirve para funciones del navegador: Realtime, subir
 * imágenes a Storage desde el formulario, etc.
 */
export function createClient() {
  const { url, key } = requireSupabaseEnv();
  return createBrowserClient<Database>(url, key);
}
