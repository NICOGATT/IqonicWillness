import "server-only";

import { cookies } from "next/headers";

import { siteConfig } from "@/config/site";
import { getDistributorBySlug, REFERRAL_COOKIE, resolveDistributorSafely } from "@/lib/referral-attribution";
import { IQONIC_ID_REGEX, normalizeIqonicId } from "@/lib/validation/customer";
import type {
  ClienteReferido,
  DistribuidorContacto,
  DistribuidorPublico,
  DistribuidorRow,
  PedidoReferidoRow,
  ResumenDistribuidor,
} from "@/types/database";
import { isSupabaseConfigured } from "@/utils/supabase/env";
import { createPublicClient } from "@/utils/supabase/public";
import { createClient } from "@/utils/supabase/server";

/**
 * Data Access Layer de referidos (solo servidor).
 * Las escrituras están en app/referidos/actions.ts.
 */

export { getDistributorBySlug };

/**
 * Número que recibe los pedidos sin referido.
 * NEXT_PUBLIC_DEFAULT_WHATSAPP o, si falta, el número general del sitio.
 */
export function getDefaultWhatsApp(): string {
  const raw = process.env.NEXT_PUBLIC_DEFAULT_WHATSAPP?.trim() || siteConfig.whatsappNumber;
  return raw.replace(/\D/g, "");
}

/**
 * Distribuidor de la cookie iqonic_ref, revalidado en la base de datos
 * (la cookie la puede editar el navegador). null = sin referido o inválido.
 *
 * Ojo: leer cookies vuelve dinámico el componente que lo use.
 */
export async function getActiveReferral(): Promise<DistribuidorPublico | null> {
  const cookieStore = await cookies();
  return resolveDistributorSafely(cookieStore.get(REFERRAL_COOKIE)?.value);
}

/** A quién va el WhatsApp del pedido: distribuidor activo o número por defecto. */
export async function getOrderRecipient(): Promise<{ phone: string; distributor: DistribuidorPublico | null }> {
  const distributor = await getActiveReferral();
  return { phone: distributor?.whatsapp ?? getDefaultWhatsApp(), distributor };
}

const EMPTY_SUMMARY: ResumenDistribuidor = {
  total_pedidos: 0,
  pedidos_concretados: 0,
  monto_total: 0,
  monto_concretado: 0,
  ultimo_pedido_at: null,
  por_estado: {},
};

export type DistributorStats =
  | { status: "unconfigured" }
  | { status: "anonymous" }
  /** Tiene cuenta pero todavía no creó su tienda (mostrar el formulario). */
  | { status: "no-profile"; userId: string }
  | { status: "error"; error: string }
  | {
      status: "ok";
      profile: DistribuidorRow;
      summary: ResumenDistribuidor;
      /** Los más recientes primero (máx. `limit`). */
      orders: PedidoReferidoRow[];
    };

/**
 * Perfil + métricas + historial del distribuidor autenticado.
 * Valida el JWT con getClaims(); RLS limita todo a SUS datos.
 */
export async function getMyDistributorStats({ limit = 50 }: { limit?: number } = {}): Promise<DistributorStats> {
  if (!isSupabaseConfigured()) return { status: "unconfigured" };

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (authError || !userId) return { status: "anonymous" };

  const { data: profile, error: profileError } = await supabase
    .from("distribuidores")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (profileError) {
    console.error("[referidos] No se pudo leer el perfil:", profileError.message);
    return { status: "error", error: "No se pudo cargar tu perfil de distribuidor." };
  }
  if (!profile) return { status: "no-profile", userId };

  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 200);
  const [ordersResult, summaryResult] = await Promise.all([
    supabase
      .from("pedidos_referidos")
      .select("*")
      .eq("distribuidor_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(safeLimit),
    supabase.rpc("resumen_distribuidor"),
  ]);

  if (ordersResult.error || summaryResult.error) {
    console.error(
      "[referidos] No se pudieron leer las métricas:",
      ordersResult.error?.message ?? summaryResult.error?.message,
    );
    return { status: "error", error: "No se pudieron cargar tus pedidos." };
  }

  const summary = { ...EMPTY_SUMMARY, ...(summaryResult.data as unknown as Partial<ResumenDistribuidor>) };
  return {
    status: "ok",
    profile,
    // numeric → number por las dudas (igual que app/pedidos/actions.ts)
    summary: { ...summary, monto_total: Number(summary.monto_total), monto_concretado: Number(summary.monto_concretado) },
    orders: ordersResult.data.map((o) => ({ ...o, total: Number(o.total) })),
  };
}

/* =====================================================================
 * Roles + iqonic_id (migración 0006)
 * ===================================================================== */

/**
 * Contacto público de un distribuidor a partir de su iqonic_id o del slug de
 * su tienda: SOLO full_name, iqonic_id y whatsapp (RPC distribuidor_publico).
 * Para la landing de referido y el botón "Escribirle por WhatsApp".
 * null = no existe, su tienda está pausada o Supabase falló.
 */
export async function getDistributorContact(ref: string | null | undefined): Promise<DistribuidorContacto | null> {
  const clean = ref?.trim();
  if (!clean || clean.length > 80) return null;

  const supabase = createPublicClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("distribuidor_publico", { p_ref: clean }).maybeSingle();
  if (error) {
    console.error("[referidos] distribuidor_publico falló:", error.code, error.message);
    return null;
  }
  return data;
}

/**
 * iqonic_id del patrocinador para un registro nuevo:
 *   1. distribuidor de la cookie iqonic_ref (la deja ?ref=<slug> o /r/<slug>);
 *   2. si no hay, DEFAULT_REFERRER_IQONIC_ID (distribuidor por defecto, opcional);
 *   3. si tampoco, null (tráfico orgánico).
 *
 * La cookie la puede editar el navegador: se revalida aquí y, otra vez, en el
 * trigger handle_new_customer() (que ignora iqonic_id que no sean de un distribuidor).
 */
export async function resolveReferrerIqonicId(): Promise<string | null> {
  const cookieStore = await cookies();
  const fromCookie = await getDistributorContact(cookieStore.get(REFERRAL_COOKIE)?.value);
  if (fromCookie) return fromCookie.iqonic_id;

  const fallback = normalizeIqonicId(process.env.DEFAULT_REFERRER_IQONIC_ID ?? "");
  return IQONIC_ID_REGEX.test(fallback) ? fallback : null;
}

export type ReferredClients =
  | { status: "unconfigured" }
  | { status: "anonymous" }
  /** Tiene sesión pero no es distribuidor (o no tiene iqonic_id). */
  | { status: "not-distributor" }
  | { status: "error"; error: string }
  | { status: "ok"; iqonicId: string; clients: ClienteReferido[]; total: number };

/**
 * Clientes referidos por el distribuidor autenticado (panel del distribuidor).
 *
 * La seguridad la pone RLS ("Distribuidor ve sus referidos"): aunque se quitara
 * el filtro .eq("referred_by_iqonic_id", …), la BD solo devolvería SUS
 * referidos y su propio perfil. El filtro está para usar el índice
 * customers_referred_by_idx y excluir su propia fila.
 */
export async function getMyReferredClients({
  limit = 50,
  offset = 0,
}: { limit?: number; offset?: number } = {}): Promise<ReferredClients> {
  if (!isSupabaseConfigured()) return { status: "unconfigured" };

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (authError || !userId) return { status: "anonymous" };

  const { data: me, error: meError } = await supabase
    .from("customers")
    .select("role, iqonic_id")
    .eq("id", userId)
    .maybeSingle();
  if (meError) {
    console.error("[referidos] No se pudo leer el perfil:", meError.message);
    return { status: "error", error: "No se pudo cargar tu perfil." };
  }
  if (!me || me.role !== "distributor" || !me.iqonic_id) return { status: "not-distributor" };

  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 200);
  const safeOffset = Math.max(Math.trunc(offset), 0);
  const { data, error, count } = await supabase
    .from("customers")
    .select("id, full_name, email, phone, whatsapp, created_at", { count: "exact" })
    .eq("referred_by_iqonic_id", me.iqonic_id)
    .eq("role", "client")
    .order("created_at", { ascending: false })
    .range(safeOffset, safeOffset + safeLimit - 1);

  if (error) {
    console.error("[referidos] No se pudieron leer los clientes referidos:", error.message);
    return { status: "error", error: "No se pudieron cargar tus clientes." };
  }
  return { status: "ok", iqonicId: me.iqonic_id, clients: data, total: count ?? data.length };
}
