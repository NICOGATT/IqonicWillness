import type { NextRequest } from "next/server";

import { updateSession } from "@/utils/supabase/proxy";

/**
 * Proxy de Next.js 16 (antes "middleware").
 * Solo se ejecuta en /admin: la tienda pública sigue siendo 100 % estática.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/admin/:path*"],
};
