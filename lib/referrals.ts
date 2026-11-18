import "server-only";

import { cookies } from "next/headers";

import { siteConfig } from "@/config/site";
import { getDistributorBySlug, REFERRAL_COOKIE, resolveDistributorSafely } from "@/lib/referral-attribution";
import type { DistribuidorPublico, DistribuidorRow, PedidoReferidoRow, ResumenDistribuidor } from "@/types/database";
import { isSupabaseConfigured } from "@/utils/supabase/env";
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
