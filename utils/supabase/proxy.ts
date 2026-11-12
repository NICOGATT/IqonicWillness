import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database";
import { getSupabaseEnv } from "@/utils/supabase/env";

const LOGIN_PATH = "/admin/login";

/**
 * Refresca la sesión de Supabase (renueva el token y reescribe las cookies)
 * y hace una comprobación OPTIMISTA de acceso a /admin.
 *
 * La verificación real (¿es administrador?) se repite en el servidor
 * (lib/auth.ts) y en la base de datos (RLS). El proxy solo evita mostrar
 * el panel a quien claramente no tiene sesión.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const env = getSupabaseEnv();
  if (!env) return response; // Sin Supabase configurado, la página de login mostrará el aviso.

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
  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === LOGIN_PATH;

  if (!isLoggedIn && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.search = "";
    return redirectWithCookies(url, response);
  }

  if (isLoggedIn && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return redirectWithCookies(url, response);
  }

  return response;
}

/** Redirige conservando las cookies de sesión recién refrescadas. */
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
