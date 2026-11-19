import { notFound } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";

import { applyReferral, parseReferralRef, resolveReferral } from "@/lib/referral-attribution";

/**
 * Enlace de referido en la raíz: /juan-perez (slug de tienda) o /123456 (iqonic_id).
 *
 * Las rutas reales (/pago, /cuenta, /productos…) siempre le ganan a este
 * segmento dinámico, por eso esos nombres están en RESERVED_SLUGS.
 *
 * A diferencia de /r/<slug>, aquí una ruta que no es de ningún distribuidor
 * responde 404: /<lo-que-sea> también recibe los errores de tipeo.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  if (!parseReferralRef(ref)) notFound();

  const referral = await resolveReferral(ref);
  if (!referral.sponsor && !referral.store) notFound();

  return applyReferral(NextResponse.redirect(new URL("/", request.url)), referral);
}
