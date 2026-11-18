import type { NextRequest } from "next/server";

import { handleReferralQuery, REFERRAL_QUERY_PARAM } from "@/lib/referral-attribution";
import { updateSession } from "@/utils/supabase/proxy";

/**
 * Proxy de Next.js 16 (antes "middleware").
 * Se ejecuta en:
 *   · el panel, el área de clientes y las rutas de auth (sesión de Supabase);
 *   · CUALQUIER página que llegue con ?ref=<slug> (atribución de referidos):
 *     guarda la cookie iqonic_ref y redirige a la URL sin ?ref.
 * El resto de la tienda pública sigue siendo 100 % estática.
 */
export async function proxy(request: NextRequest) {
  if (request.nextUrl.searchParams.has(REFERRAL_QUERY_PARAM)) {
    // La siguiente petición (ya sin ?ref) pasa por updateSession si es una ruta protegida
    return handleReferralQuery(request);
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/cuenta/:path*",
    "/mi-panel/:path*",
    "/ingresar",
    "/registro",
    "/recuperar",
    "/auth/:path*",
    // Enlaces de referido en cualquier página (no API, assets ni archivos con extensión)
    {
      source: "/((?!api|_next/static|_next/image|.*\\..*).*)",
      has: [{ type: "query", key: "ref" }],
    },
  ],
};
