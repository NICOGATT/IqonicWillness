import type { NextRequest } from "next/server";

import { updateSession } from "@/utils/supabase/proxy";

/**
 * Proxy de Next.js 16 (antes "middleware").
 * Solo se ejecuta en el panel, el área de clientes y las rutas de auth:
 * la tienda pública sigue siendo 100 % estática.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/admin/:path*", "/cuenta/:path*", "/ingresar", "/registro", "/recuperar", "/auth/:path*"],
};
