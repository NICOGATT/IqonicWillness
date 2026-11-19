import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { IQONIC_ID_REGEX, normalizeIqonicId } from "@/lib/validation/customer";
import { isValidSlugFormat } from "@/lib/validation/referral";
import type { Database, DistribuidorContacto, DistribuidorPublico } from "@/types/database";
import { getSupabaseEnv } from "@/utils/supabase/env";

/**
 * Atribución de referidos: quién trajo al comprador.
 *
 *   /?ref=juan-perez · /?ref=123456 (cualquier página) → proxy.ts
 *   /r/juan-perez                                       → app/r/[slug]/route.ts
 *   /juan-perez · /123456                               → app/[ref]/route.ts
 *
 * El ref puede ser el slug de una tienda o el iqonic_id del distribuidor.
 * Todos lo validan en Supabase, guardan dos cookies por 30 días y redirigen a
 * la URL limpia (sin ?ref): así la tienda sigue siendo estática y cacheable, y
 * el enlace no queda pegado si el comprador comparte la página.
 *
 *   iqonic_ref     → slug de la tienda: a quién van los pedidos (checkout).
 *   iqonic_sponsor → iqonic_id del distribuidor: su patrocinador al registrarse.
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

/* =====================================================================
 * Patrocinador (migración 0006): el iqonic_id del distribuidor que invitó
 * ===================================================================== */

/**
 * iqonic_id del distribuidor que trajo a la visita. Lo lee el registro para
 * guardar customers.referred_by_iqonic_id, y la UI para "Invitado por …".
 * Igual que iqonic_ref: no es httpOnly ni un secreto (el servidor y el
 * trigger handle_new_customer() lo vuelven a validar).
 */
export const SPONSOR_COOKIE = "iqonic_sponsor";

/**
 * Lo que puede venir en ?ref=, /r/<ref> o /<ref>: el slug de una tienda
 * ("juan-perez") o un iqonic_id ("123456", "AB_123"). null si no tiene el
 * formato de ninguno de los dos (así no se consulta la BD por basura).
 */
export function parseReferralRef(value: string | null | undefined): string | null {
  const ref = value?.trim();
  if (!ref || ref.length > 40) return null;
  if (parseReferralSlug(ref)) return ref;
  return IQONIC_ID_REGEX.test(normalizeIqonicId(ref)) ? ref : null;
}

export type ResolvedReferral = {
  /** Distribuidor con rol "distributor" (customers): patrocinador del registro. */
  sponsor: DistribuidorContacto | null;
  /** Su tienda activa (distribuidores): a quién se atribuyen los pedidos. */
  store: DistribuidorPublico | null;
};

const NOBODY: ResolvedReferral = { sponsor: null, store: null };

/**
 * Resuelve un enlace de referido a patrocinador + tienda. Nunca lanza: ante
 * un error de Supabase devuelve "nadie" (la visita sigue como orgánica).
 *
 *   · distribuidor_publico(ref) acepta iqonic_id o slug y devuelve SOLO
 *     full_name, iqonic_id y whatsapp (SECURITY DEFINER, migración 0006).
 *   · La tienda se busca por slug (RLS: solo activas y columnas públicas).
 *
 * Si el ref coincidió con el iqonic_id de alguien, una tienda con ese mismo
 * slug podría ser de OTRA persona: entonces no se usa la tienda, para no
 * mezclar el patrocinador de uno con los pedidos de otro.
 */
export async function resolveReferral(value: string | null | undefined): Promise<ResolvedReferral> {
  const ref = parseReferralRef(value);
  const env = getSupabaseEnv();
  if (!ref || !env) return NOBODY;

  const supabase = createSupabaseClient<Database>(env.url, env.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const [sponsorResult, store] = await Promise.all([
    supabase.rpc("distribuidor_publico", { p_ref: ref }).maybeSingle(),
    resolveDistributorSafely(ref),
  ]);
  if (sponsorResult.error) {
    console.error("[referidos] distribuidor_publico falló:", sponsorResult.error.code, sponsorResult.error.message);
  }
  const sponsor = sponsorResult.error ? null : sponsorResult.data;

  const matchedByIqonicId = sponsor !== null && sponsor.iqonic_id === normalizeIqonicId(ref);
  return { sponsor, store: matchedByIqonicId ? null : store };
}

const expired = { ...referralCookieOptions, maxAge: 0 };

/**
 * Guarda la atribución en la respuesta. Modelo "último clic": un enlace que
 * resolvió a alguien reemplaza las DOS cookies (si el nuevo distribuidor no
 * tiene tienda, se borra la del anterior para no mandarle a él los pedidos).
 * Un enlace que no resolvió a nadie no toca nada.
 */
export function applyReferral(response: NextResponse, { sponsor, store }: ResolvedReferral): NextResponse {
  if (!sponsor && !store) return response;
  response.cookies.set(REFERRAL_COOKIE, store?.slug ?? "", store ? referralCookieOptions : expired);
  response.cookies.set(SPONSOR_COOKIE, sponsor?.iqonic_id ?? "", sponsor ? referralCookieOptions : expired);
  return response;
}

/**
 * Proxy: la petición trae ?ref=<slug | iqonic_id>.
 * Valida, guarda las cookies si corresponde y redirige a la misma URL sin ?ref.
 */
export async function handleReferralQuery(request: NextRequest): Promise<NextResponse> {
  const cleanUrl = request.nextUrl.clone();
  const rawRef = cleanUrl.searchParams.get(REFERRAL_QUERY_PARAM);
  cleanUrl.searchParams.delete(REFERRAL_QUERY_PARAM);
  return applyReferral(NextResponse.redirect(cleanUrl), await resolveReferral(rawRef));
}
