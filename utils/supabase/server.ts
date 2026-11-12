import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";
import { requireSupabaseEnv } from "@/utils/supabase/env";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 * Lee y escribe la sesión del usuario en cookies, así las consultas viajan
 * con su JWT y RLS sabe quién es.
 *
 * Crea uno nuevo en cada petición (no lo guardes en una variable global).
 */
export async function createClient() {
  const { url, key } = requireSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Llamado desde un Server Component (no puede escribir cookies).
          // Es seguro ignorarlo: proxy.ts refresca la sesión en cada petición a /admin.
        }
      },
    },
  });
}
