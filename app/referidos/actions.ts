"use server";

import { siteConfig } from "@/config/site";
import { buildOrderMessage } from "@/lib/cart";
import { getCheckoutMessageLines, getCheckoutOrderNote, getPaymentMethod } from "@/lib/checkout";
import { getDefaultWhatsApp, getOrderRecipient } from "@/lib/referrals";
import {
  distributorProfileSchema,
  normalizeWhatsApp,
  referralOrderSchema,
  type DistributorProfileField,
  type DistributorProfileInput,
  type ReferralOrderInput,
} from "@/lib/validation/referral";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import type { CreatedOrder, CreatedReferralOrder, DistribuidorRow } from "@/types/database";
import { isSupabaseConfigured } from "@/utils/supabase/env";
import { createClient } from "@/utils/supabase/server";

/* =====================================================================
 * Perfil del distribuidor
 * ===================================================================== */

export type UpsertDistributorResult =
  | { ok: true; profile: DistribuidorRow; created: boolean }
  | {
      ok: false;
      reason: "unauthenticated" | "invalid" | "slug-taken" | "forbidden" | "failed";
      error: string;
      fieldErrors?: Partial<Record<DistributorProfileField, string>>;
    };

/**
 * Crea o actualiza la tienda replicada del usuario autenticado.
 * 1. Valida slug (formato, reservados, disponibilidad) y limpia el WhatsApp.
 * 2. Insert o update de SU fila (RLS: auth.uid() = user_id).
 *
 * No usa upsert() de PostgREST: su ON CONFLICT reescribe user_id y el rol
 * authenticated no tiene permiso de UPDATE sobre esa columna (a propósito).
 */
export async function upsertDistributorProfile(input: DistributorProfileInput): Promise<UpsertDistributorResult> {
  const parsed = distributorProfileSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<DistributorProfileField, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as DistributorProfileField;
      fieldErrors[field] ??= issue.message;
    }
    return { ok: false, reason: "invalid", error: "Revisa los datos del formulario.", fieldErrors };
  }
  if (!isSupabaseConfigured()) return { ok: false, reason: "failed", error: "Supabase no está configurado." };

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (authError || !userId) {
    return { ok: false, reason: "unauthenticated", error: "Inicia sesión para configurar tu tienda." };
  }

  const data = parsed.data;
  const slugTaken = {
    ok: false as const,
    reason: "slug-taken" as const,
    error: "Ese enlace ya está en uso.",
    fieldErrors: { slug: `"${data.slug}" ya está en uso, prueba con otro.` },
  };

  // Chequeo amable antes de escribir (ve también slugs de distribuidores inactivos)
  const { data: available, error: availableError } = await supabase.rpc("slug_disponible", { p_slug: data.slug });
  if (availableError) console.error("[referidos] slug_disponible falló:", availableError.message);
  else if (!available) return slugTaken;

  const { data: existing, error: readError } = await supabase
    .from("distribuidores")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) {
    console.error("[referidos] No se pudo leer el perfil:", readError.message);
    return { ok: false, reason: "failed", error: "No se pudo guardar tu perfil. Intenta de nuevo." };
  }

  const values = { slug: data.slug, nombre_mostrar: data.nombre_mostrar, whatsapp: data.whatsapp };
  const result = existing
    ? await supabase.from("distribuidores").update(values).eq("id", existing.id).select("*").single()
    : await supabase
        .from("distribuidores")
        .insert({ ...values, user_id: userId })
        .select("*")
        .single();

  if (result.error) {
    const { code, message } = result.error;
    // 23505 = UNIQUE: otro usuario tomó el slug entre el chequeo y la escritura
    // (o doble envío del formulario al crear: entonces es user_id)
    if (code === "23505") {
      return message.includes("user_id")
        ? { ok: false, reason: "failed", error: "Tu tienda ya existe: recarga la página." }
        : slugTaken;
    }
    if (code === "23514") return { ok: false, reason: "invalid", error: "Algún dato no tiene el formato correcto." };
    if (code === "42501") return { ok: false, reason: "forbidden", error: "No tienes permiso para editar este perfil." };
    console.error("[referidos] No se pudo guardar el perfil:", message);
    return { ok: false, reason: "failed", error: "No se pudo guardar tu perfil. Intenta de nuevo." };
  }

  return { ok: true, profile: result.data, created: !existing };
}

/* =====================================================================
 * Pedido referido → WhatsApp
 * ===================================================================== */

export type ReferralOrderResult =
  | {
      ok: true;
      orderNumber: number;
      /** null solo si falta la migración 0005 (pedido registrado sin atribución). */
      pedidoReferidoId: string | null;
      whatsappUrl: string;
      /** Quién recibe el pedido (null = tienda principal). */
      distributor: { slug: string; nombre_mostrar: string } | null;
    }
  /**
   * invalid     → datos mal formados: mostrar el error.
   * unavailable → un producto ya no existe: avisar y no abrir WhatsApp.
   * failed      → error técnico: el carrito arma su propio mensaje y lo manda
   *               a `fallbackPhone` (el del distribuidor si lo hay) para no perder la venta.
   */
  | { ok: false; reason: "invalid" | "unavailable" | "failed"; error: string; fallbackPhone: string };

/**
 * Registra el pedido y devuelve el enlace wa.me del distribuidor que trajo al
 * comprador (cookie iqonic_ref) o del número por defecto.
 *
 * 1. Resuelve el destinatario: cookie → distribuidor ACTIVO en la BD; si no, NEXT_PUBLIC_DEFAULT_WHATSAPP.
 * 2. create_referral_order(): crea la orden (precios de la BD, ADR-003), la
 *    atribuye y la deja visible en /admin/pedidos y en el panel del distribuidor.
 * 3. Arma el mensaje con el número de pedido (#1042).
 */
export async function createReferralOrderAndGetWhatsAppUrl(input: ReferralOrderInput): Promise<ReferralOrderResult> {
  const { phone, distributor } = await getOrderRecipient();
  const fail = (reason: "invalid" | "unavailable" | "failed", error: string): ReferralOrderResult => ({
    ok: false,
    reason,
    error,
    fallbackPhone: phone,
  });

  const parsed = referralOrderSchema.safeParse(input);
  if (!parsed.success) return fail("invalid", parsed.error.issues[0]?.message ?? "Pedido inválido");

  const { items, note, checkout, cliente } = parsed.data;
  // La tarjeta va por startCardPayment (app/pago/actions.ts): por aquí solo entran pedidos por WhatsApp
  if (checkout && getPaymentMethod(checkout.paymentMethod).flow !== "whatsapp") {
    return fail("invalid", "Ese medio de pago todavía no está disponible.");
  }
  if (!phone) return fail("failed", "No hay un número de WhatsApp configurado para recibir pedidos.");
  if (!isSupabaseConfigured()) return fail("failed", "Supabase no está configurado.");

  const clienteNombre = checkout?.name.trim() || cliente?.nombre?.trim() || null;
  const clienteTelefono = normalizeWhatsApp(checkout?.phone ?? cliente?.telefono ?? "") || null;

  // Cliente con cookies: si hay sesión, el pedido queda vinculado al cliente
  const supabase = await createClient();
  const pNote = checkout ? getCheckoutOrderNote(checkout, note) : note || null;
  const pCurrency = siteConfig.currency.toUpperCase();
  let { data, error } = await supabase.rpc("create_referral_order", {
    p_items: items,
    // La BD vuelve a validar que el distribuidor exista y esté activo
    p_ref_slug: distributor?.slug ?? null,
    p_cliente_nombre: clienteNombre,
    p_cliente_telefono: clienteTelefono,
    p_note: pNote,
    p_currency: pCurrency,
  });

  // PGRST202 = la función todavía no existe (falta ejecutar 0005_referrals.sql).
  // Registra el pedido como antes, sin atribución, para no perder ventas.
  if (error?.code === "PGRST202") {
    console.error("[referidos] Falta la migración 0005_referrals.sql: pedido registrado sin atribución.");
    ({ data, error } = await supabase.rpc("create_order", {
      p_items: items,
      p_note: pNote,
      p_channel: "whatsapp",
      p_currency: pCurrency,
    }));
  }

  if (error || !data) {
    console.error("[referidos] create_referral_order falló:", error?.code, error?.message);
    // P0002 = un producto se desactivó o borró mientras estaba en el carrito
    if (error?.code === "P0002") {
      return fail("unavailable", "Un producto del carrito ya no está disponible. Quítalo y vuelve a intentarlo.");
    }
    // 22023 = validación de create_order / create_referral_order (cantidades, teléfono…)
    if (error?.code === "22023") return fail("invalid", error.message);
    return fail("failed", "No se pudo registrar el pedido.");
  }

  // Con el respaldo de create_order() no vienen pedido_referido_id ni distribuidor
  const order = data as unknown as CreatedOrder & Partial<Omit<CreatedReferralOrder, keyof CreatedOrder>>;
  // La BD tiene la última palabra: si el distribuidor se desactivó justo ahora,
  // el pedido quedó como venta directa y va al número por defecto
  const recipient = order.distribuidor?.whatsapp ?? getDefaultWhatsApp();

  const message = buildOrderMessage({
    orderNumber: order.number,
    contactName: order.contact_name ?? clienteNombre,
    details: checkout ? getCheckoutMessageLines(checkout) : undefined,
    lines: order.items.map((i) => ({
      kind: i.kind,
      name: i.name,
      detail: i.detail,
      unitPrice: i.unit_price === null ? null : Number(i.unit_price),
      quantity: i.quantity,
    })),
    total: Number(order.total),
    hasUnpriced: order.has_unpriced_items,
    // Con checkout, customer_note guarda el resumen para el admin: en el mensaje va solo el comentario
    note: checkout ? note : order.customer_note,
  });

  return {
    ok: true,
    orderNumber: order.number,
    pedidoReferidoId: order.pedido_referido_id ?? null,
    whatsappUrl: buildWhatsAppUrl(message, recipient),
    distributor: order.distribuidor
      ? { slug: order.distribuidor.slug, nombre_mostrar: order.distribuidor.nombre_mostrar }
      : null,
  };
}
