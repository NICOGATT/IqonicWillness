import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/customer";
import { resolveDistributorSafely, setReferralCookie } from "@/lib/referral-attribution";

/**
 * Enlace corto de tienda replicada: /r/juan-perez
 * Opcional: /r/juan-perez?to=/productos/ignite → aterriza en esa página.
 *
 * Si el distribuidor existe y está activo guarda la cookie iqonic_ref (30 días);
 * si no, redirige igual sin tocar la atribución previa (nunca un 404 para el comprador).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = new URL(safeNextPath(request.nextUrl.searchParams.get("to"), "/"), request.url);
  const response = NextResponse.redirect(destination);

  const distributor = await resolveDistributorSafely(slug);
  return distributor ? setReferralCookie(response, distributor.slug) : response;
}
