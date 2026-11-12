import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database";
import { getSupabaseEnv } from "@/utils/supabase/env";

/**
 * Reglas de acceso OPTIMISTAS (solo miran si hay sesión).
 * La comprobación real se repite en el servidor (lib/auth.ts, lib/customer.ts)
 * y en la base de datos (RLS).
 */
const ADMIN_LOGIN = "/admin/login";
const CUSTOMER_LOGIN = "/ingresar";
/** Páginas solo para invitados: con sesión no tiene sentido verlas. */
const GUEST_ONLY = ["/ingresar", "/registro", "/recuperar"];

/**
 * Refresca la sesión de Supabase (renueva el token y reescribe las cookies)
 * y redirige según la ruta.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const env = getSupabaseEnv();
  if (!env) return response; // Sin Supabase configurado, las páginas muestran un aviso.

  const supabase = createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // IMPORTANTE: no pongas código entre createServerClient y getClaims().
  // getClaims() valida la firma del JWT y refresca la sesión si hace falta.
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  const go = (path: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = params ? `?${new URLSearchParams(params)}` : "";
    return redirectWithCookies(url, response);
  };

  // --- Panel de administración ---
  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn && pathname !== ADMIN_LOGIN) return go(ADMIN_LOGIN);
    if (isLoggedIn && pathname === ADMIN_LOGIN) return go("/admin");
    return response;
  }

  // --- Área de clientes ---
  if (pathname.startsWith("/cuenta") && !isLoggedIn) {
    // Tras iniciar sesión vuelve a la página que pidió
    return go(CUSTOMER_LOGIN, { next: pathname + search });
  }
  if (isLoggedIn && GUEST_ONLY.includes(pathname)) return go("/cuenta");

  return response;
}

/** Redirige conservando las cookies de sesión recién refrescadas. */
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
