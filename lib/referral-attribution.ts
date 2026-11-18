import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { isValidSlugFormat } from "@/lib/validation/referral";
import type { Database, DistribuidorPublico } from "@/types/database";
import { getSupabaseEnv } from "@/utils/supabase/env";

/**
 * Atribución de referidos: quién trajo al comprador.
 *
 *   /?ref=juan-perez  (cualquier página)  → proxy.ts
 *   /r/juan-perez                          → app/r/[slug]/route.ts
 *
 * Ambos validan el slug en Supabase, guardan la cookie `iqonic_ref` 30 días y
 * redirigen a la URL limpia (sin ?ref): así la tienda sigue siendo estática y
 * cacheable, y el enlace no queda pegado si el comprador comparte la página.
 *
 * Modelo "último clic": un enlace válido nuevo reemplaza al anterior; uno
 * inválido o de un distribuidor inactivo NO borra la atribución que ya había.
 *
 * La cookie NO es httpOnly a propósito: la UI estática puede leerla para
 * mostrar "Estás comprando con Juan" sin volver dinámica la página. No es un
 * secreto: el checkout la vuelve a validar contra la base de datos.
 *
 * Sin "server-only": este módulo también corre dentro de proxy.ts.
 */

export const REFERRAL_COOKIE = "iqonic_ref";
export const REFERRAL_QUERY_PARAM = "ref";
export const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 días, en segundos

export const referralCookieOptions = {
  path: "/",
  maxAge: REFERRAL_COOKIE_MAX_AGE,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  httpOnly: false,
} as const;

/** Normaliza lo que llega en la URL o la cookie; null si no puede ser un slug. */
export function parseReferralSlug(value: string | null | undefined): string | null {
  if (!value) return null;
  // searchParams y cookies ya llegan decodificados
  const slug = value.trim().toLowerCase();
  return isValidSlugFormat(slug) ? slug : null;
}

/**
 * Distribuidor ACTIVO por slug, o null si no existe / está inactivo / el
 * formato es inválido. Usa la clave pública sin cookies: RLS solo deja ver
 * distribuidores activos y las columnas públicas.
 *
 * Lanza si Supabase falla (red, configuración): quien llama decide si
 * degradar a "sin referido".
 */
export async function getDistributorBySlug(slug: string): Promise<DistribuidorPublico | null> {
  const clean = parseReferralSlug(slug);
  if (!clean) return null;

  const env = getSupabaseEnv();
  if (!env) throw new Error("Supabase no está configurado");

  const supabase = createSupabaseClient<Database>(env.url, env.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase
    .from("distribuidores")
    .select("id, slug, nombre_mostrar, whatsapp")
    .eq("slug", clean)
    .eq("activo", true)
    .maybeSingle();

  if (error) throw new Error(`[referidos] No se pudo resolver el slug "${clean}": ${error.message}`);
  return data;
}

/** Igual que getDistributorBySlug pero nunca lanza: ante un error, null (sin referido). */
export async function resolveDistributorSafely(slug: string | null | undefined): Promise<DistribuidorPublico | null> {
  if (!slug) return null;
  try {
    return await getDistributorBySlug(slug);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return null;
  }
}

export function setReferralCookie(response: NextResponse, slug: string): NextResponse {
  response.cookies.set(REFERRAL_COOKIE, slug, referralCookieOptions);
  return response;
}

/**
 * Proxy: la petición trae ?ref=<slug>.
 * Valida, guarda la cookie si corresponde y redirige a la misma URL sin ?ref.
 */
export async function handleReferralQuery(request: NextRequest): Promise<NextResponse> {
  const cleanUrl = request.nextUrl.clone();
  const rawSlug = cleanUrl.searchParams.get(REFERRAL_QUERY_PARAM);
  cleanUrl.searchParams.delete(REFERRAL_QUERY_PARAM);
  const response = NextResponse.redirect(cleanUrl);

  const slug = parseReferralSlug(rawSlug);
  if (!slug) return response;

  // Mismo enlace que ya tenía: solo renueva los 30 días (el checkout revalida igual)
  if (request.cookies.get(REFERRAL_COOKIE)?.value === slug) return setReferralCookie(response, slug);

  const distributor = await resolveDistributorSafely(slug);
  return distributor ? setReferralCookie(response, distributor.slug) : response;
}
