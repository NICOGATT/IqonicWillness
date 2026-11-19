import "server-only";

import { cookies } from "next/headers";

import { siteConfig } from "@/config/site";
import {
  getDistributorBySlug,
  REFERRAL_COOKIE,
  resolveDistributorSafely,
  SPONSOR_COOKIE,
} from "@/lib/referral-attribution";
import { IQONIC_ID_REGEX, normalizeIqonicId } from "@/lib/validation/customer";
import type {
  ClienteReferido,
  ClienteReferidoConEstado,
  ClienteReferidoEstado,
  CustomerRow,
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

/* =====================================================================
 * Acceso al panel del distribuidor
 * ===================================================================== */

type ServerClient = Awaited<ReturnType<typeof createClient>>;
export type DistributorMe = Pick<CustomerRow, "role" | "iqonic_id" | "full_name" | "first_name" | "whatsapp">;

type DistributorContext =
  | { status: "unconfigured" }
  | { status: "anonymous" }
  /** Tiene sesión pero es cliente (y no tiene una tienda creada antes de los roles). */
  | { status: "not-distributor" }
  | { status: "error"; error: string }
  | {
      status: "ok";
      supabase: ServerClient;
      userId: string;
      /** null solo si falta la migración 0006 (no existe la columna role). */
      me: DistributorMe | null;
      /** Tienda replicada (0005); null = todavía no la creó. */
      store: DistribuidorRow | null;
    };

/**
 * Sesión + perfil (customers) + tienda (distribuidores) del usuario.
 * Valida el JWT con getClaims(); RLS limita cada lectura a SU fila.
 *
 * Entran al panel: role = 'distributor', los admins (soporte) y quien ya
 * tenía una tienda creada antes de que existieran los roles (0005).
 * Un cliente común recibe "not-distributor".
 */
async function getDistributorContext(): Promise<DistributorContext> {
  if (!isSupabaseConfigured()) return { status: "unconfigured" };

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (authError || !userId) return { status: "anonymous" };

  const [meResult, storeResult] = await Promise.all([
    supabase.from("customers").select("role, iqonic_id, full_name, first_name, whatsapp").eq("id", userId).maybeSingle(),
    supabase.from("distribuidores").select("*").eq("user_id", userId).maybeSingle(),
  ]);

  // 42703 = columna inexistente: falta 0006_roles_iqonic_id.sql (se sigue como antes, solo por tienda)
  if (meResult.error && meResult.error.code !== "42703") {
    console.error("[referidos] No se pudo leer el perfil:", meResult.error.message);
    return { status: "error", error: "No se pudo cargar tu perfil." };
  }
  if (storeResult.error) {
    console.error("[referidos] No se pudo leer la tienda:", storeResult.error.message);
    return { status: "error", error: "No se pudo cargar tu perfil de distribuidor." };
  }

  const me = meResult.error ? null : meResult.data;
  const store = storeResult.data;
  const allowed = me?.role === "distributor" || me?.role === "admin" || store !== null;
  if (!allowed) return { status: "not-distributor" };
  return { status: "ok", supabase, userId, me, store };
}

/** Lo que pasa el contexto a quien llama cuando no es "ok" (mismo tipo en todas las funciones). */
type ContextFailure = Exclude<DistributorContext, { status: "ok" }>;

async function getStoreOrdersAndSummary(supabase: ServerClient, storeId: string, limit: number) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 200);
  const [ordersResult, summaryResult] = await Promise.all([
    supabase
      .from("pedidos_referidos")
      .select("*")
      .eq("distribuidor_id", storeId)
      .order("created_at", { ascending: false })
      .limit(safeLimit),
    supabase.rpc("resumen_distribuidor"),
  ]);

  if (ordersResult.error || summaryResult.error) {
    console.error(
      "[referidos] No se pudieron leer las métricas:",
      ordersResult.error?.message ?? summaryResult.error?.message,
    );
    return null;
  }

  const summary = { ...EMPTY_SUMMARY, ...(summaryResult.data as unknown as Partial<ResumenDistribuidor>) };
  return {
    // numeric → number por las dudas (igual que app/pedidos/actions.ts)
    summary: { ...summary, monto_total: Number(summary.monto_total), monto_concretado: Number(summary.monto_concretado) },
    orders: ordersResult.data.map((o) => ({ ...o, total: Number(o.total) })),
  };
}

export type DistributorStats =
  | ContextFailure
  /** Distribuidor que todavía no creó su tienda (mostrar el formulario). */
  | { status: "no-profile"; userId: string }
  | {
      status: "ok";
      profile: DistribuidorRow;
      summary: ResumenDistribuidor;
      /** Los más recientes primero (máx. `limit`). */
      orders: PedidoReferidoRow[];
    };

/** Tienda + métricas + historial de pedidos del distribuidor autenticado. */
export async function getMyDistributorStats({ limit = 50 }: { limit?: number } = {}): Promise<DistributorStats> {
  const ctx = await getDistributorContext();
  if (ctx.status !== "ok") return ctx;
  if (!ctx.store) return { status: "no-profile", userId: ctx.userId };

  const data = await getStoreOrdersAndSummary(ctx.supabase, ctx.store.id, limit);
  if (!data) return { status: "error", error: "No se pudieron cargar tus pedidos." };
  return { status: "ok", profile: ctx.store, ...data };
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
 *   1. cookie iqonic_sponsor (iqonic_id; la dejan ?ref=, /r/<ref> y /<ref>);
 *   2. cookie iqonic_ref (slug de la tienda, enlaces anteriores a 0006);
 *   3. `fromForm`: el campo oculto del registro, que el navegador toma de su
 *      copia en localStorage si las cookies se perdieron;
 *   4. DEFAULT_REFERRER_IQONIC_ID (distribuidor por defecto, opcional);
 *   5. si tampoco, null (tráfico orgánico).
 *
 * Todo lo que viene del navegador se puede editar: cada candidato se revalida
 * con distribuidor_publico() y, otra vez, en el trigger handle_new_customer()
 * (que ignora iqonic_id que no sean de un distribuidor).
 */
export async function resolveReferrerIqonicId(fromForm?: string | null): Promise<string | null> {
  const cookieStore = await cookies();
  const candidates = [
    cookieStore.get(SPONSOR_COOKIE)?.value,
    cookieStore.get(REFERRAL_COOKIE)?.value,
    fromForm,
  ].filter((ref, i, all): ref is string => Boolean(ref?.trim()) && all.indexOf(ref) === i);

  for (const ref of candidates) {
    const contact = await getDistributorContact(ref);
    if (contact) return contact.iqonic_id;
  }

  const fallback = normalizeIqonicId(process.env.DEFAULT_REFERRER_IQONIC_ID ?? "");
  return IQONIC_ID_REGEX.test(fallback) ? fallback : null;
}

/* ---------------------------------------------------------------------
 * Clientes referidos
 * --------------------------------------------------------------------- */

const NEW_CLIENT_DAYS = 7;

/** Últimos 10 dígitos: "+54 9 11 2345-6789" y "1123456789" son el mismo número. */
function phoneKey(value: string | null | undefined): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length >= 7 ? digits.slice(-10) : null;
}

/**
 * Teléfonos de quienes hicieron un pedido (no cancelado) en la tienda del
 * distribuidor. Los clientes del registro no están vinculados a los pedidos
 * de la tienda, así que el estado "con pedidos" se infiere por WhatsApp/teléfono.
 */
async function getBuyerPhoneKeys(supabase: ServerClient, storeId: string | null): Promise<Set<string>> {
  if (!storeId) return new Set();
  const { data, error } = await supabase
    .from("pedidos_referidos")
    .select("cliente_telefono")
    .eq("distribuidor_id", storeId)
    .not("cliente_telefono", "is", null)
    .not("estado", "in", "(cancelado,reembolsado)")
    .limit(2000);
  if (error) {
    console.error("[referidos] No se pudieron leer los teléfonos de los pedidos:", error.message);
    return new Set();
  }
  return new Set(data.map((o) => phoneKey(o.cliente_telefono)).filter((k): k is string => k !== null));
}

function withEstado(clients: ClienteReferido[], buyers: Set<string>): ClienteReferidoConEstado[] {
  const newSince = Date.now() - NEW_CLIENT_DAYS * 24 * 60 * 60 * 1000;
  return clients.map((client) => {
    const keys = [phoneKey(client.whatsapp), phoneKey(client.phone)];
    const estado: ClienteReferidoEstado = keys.some((k) => k !== null && buyers.has(k))
      ? "compro"
      : new Date(client.created_at).getTime() >= newSince
        ? "nuevo"
        : "registrado";
    return { ...client, estado };
  });
}

/**
 * Clientes del distribuidor, paginados, con su estado.
 *
 * La seguridad la pone RLS ("Distribuidor ve sus referidos"): aunque se quitara
 * el filtro .eq("referred_by_iqonic_id", …), la BD solo devolvería SUS
 * referidos y su propio perfil. El filtro está para usar el índice
 * customers_referred_by_idx y excluir su propia fila.
 */
async function fetchReferredClients(
  supabase: ServerClient,
  iqonicId: string,
  storeId: string | null,
  { limit, offset }: { limit: number; offset: number },
): Promise<{ clients: ClienteReferidoConEstado[]; total: number } | null> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 200);
  const safeOffset = Math.max(Math.trunc(offset), 0);
  const [clientsResult, buyers] = await Promise.all([
    supabase
      .from("customers")
      .select("id, full_name, email, phone, whatsapp, created_at", { count: "exact" })
      .eq("referred_by_iqonic_id", iqonicId)
      .eq("role", "client")
      .order("created_at", { ascending: false })
      .range(safeOffset, safeOffset + safeLimit - 1),
    getBuyerPhoneKeys(supabase, storeId),
  ]);

  const { data, error, count } = clientsResult;
  if (error) {
    console.error("[referidos] No se pudieron leer los clientes referidos:", error.message);
    return null;
  }
  return { clients: withEstado(data, buyers), total: count ?? data.length };
}

export type ReferredClients =
  | ContextFailure
  /** Distribuidor (o tienda vieja) sin iqonic_id: todavía no puede tener clientes registrados. */
  | { status: "no-iqonic-id" }
  | { status: "ok"; iqonicId: string; clients: ClienteReferidoConEstado[]; total: number };

/** Clientes referidos por el distribuidor autenticado (/dashboard/clientes). */
export async function getMyReferredClients({
  limit = 50,
  offset = 0,
}: { limit?: number; offset?: number } = {}): Promise<ReferredClients> {
  const ctx = await getDistributorContext();
  if (ctx.status !== "ok") return ctx;
  const iqonicId = ctx.me?.iqonic_id;
  if (!iqonicId) return { status: "no-iqonic-id" };

  const result = await fetchReferredClients(ctx.supabase, iqonicId, ctx.store?.id ?? null, { limit, offset });
  if (!result) return { status: "error", error: "No se pudieron cargar tus clientes." };
  return { status: "ok", iqonicId, ...result };
}

/* ---------------------------------------------------------------------
 * Resumen del panel (/dashboard)
 * --------------------------------------------------------------------- */

export type DistributorOverview =
  | ContextFailure
  | {
      status: "ok";
      /** Cómo saludarlo: nombre del perfil o, si falta, el de su tienda. */
      name: string;
      iqonicId: string | null;
      /**
       * Lo que va en su enlace de invitación (?ref=…): el slug de su tienda
       * (atribuye registros Y pedidos) o, sin tienda, su iqonic_id (solo registros).
       */
      referralRef: string | null;
      store: DistribuidorRow | null;
      /** null = sin iqonic_id (no puede tener clientes registrados todavía). */
      clients: { total: number; nuevos: number; latest: ClienteReferidoConEstado[] } | null;
      /** null = sin tienda (sus clientes compran en la tienda principal). */
      sales: { summary: ResumenDistribuidor; orders: PedidoReferidoRow[] } | null;
    };

/** Todo lo del resumen en una sola pasada (cada consulta en paralelo, RLS limita a SUS datos). */
export async function getDistributorOverview({ latest = 5 }: { latest?: number } = {}): Promise<DistributorOverview> {
  const ctx = await getDistributorContext();
  if (ctx.status !== "ok") return ctx;
  const { supabase, me, store } = ctx;
  const iqonicId = me?.iqonic_id ?? null;

  const weekAgo = new Date(Date.now() - NEW_CLIENT_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const [clients, nuevos, sales] = await Promise.all([
    iqonicId ? fetchReferredClients(supabase, iqonicId, store?.id ?? null, { limit: latest, offset: 0 }) : null,
    iqonicId
      ? supabase
          .from("customers")
          .select("id", { count: "exact", head: true })
          .eq("referred_by_iqonic_id", iqonicId)
          .eq("role", "client")
          .gte("created_at", weekAgo)
      : null,
    store ? getStoreOrdersAndSummary(supabase, store.id, latest) : null,
  ]);
  if ((iqonicId && !clients) || (store && !sales)) {
    return { status: "error", error: "No se pudo cargar tu resumen." };
  }
  // Solo afecta al texto "N nuevos esta semana": si falla, se omite
  if (nuevos?.error) console.error("[referidos] No se pudieron contar los clientes nuevos:", nuevos.error.message);

  return {
    status: "ok",
    name: me?.full_name?.trim() || store?.nombre_mostrar || me?.first_name || "distribuidor/a",
    iqonicId,
    referralRef: store?.activo ? store.slug : (iqonicId ?? store?.slug ?? null),
    store,
    clients: clients ? { total: clients.total, nuevos: nuevos?.count ?? 0, latest: clients.clients } : null,
    sales,
  };
}
