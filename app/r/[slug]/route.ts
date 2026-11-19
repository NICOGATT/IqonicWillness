import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/customer";
import { applyReferral, resolveReferral } from "@/lib/referral-attribution";

/**
 * Enlace corto de referido: /r/juan-perez (slug de tienda) o /r/123456 (iqonic_id).
 * Opcional: /r/juan-perez?to=/productos/ignite → aterriza en esa página.
 *
 * Si el distribuidor existe guarda las cookies iqonic_ref / iqonic_sponsor (30 días);
 * si no, redirige igual sin tocar la atribución previa (nunca un 404 para el comprador).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = new URL(safeNextPath(request.nextUrl.searchParams.get("to"), "/"), request.url);
  return applyReferral(NextResponse.redirect(destination), await resolveReferral(slug));
}
