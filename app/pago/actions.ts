"use server";

import { siteConfig } from "@/config/site";
import { getCheckoutOrderNote, orderRequestSchema, type OrderRequest } from "@/lib/checkout";
import { getStripe, PAYMENT_SOURCE, recordStripePayment, toStripeAmount } from "@/lib/stripe";
import type { CreatedOrder } from "@/types/database";
import { isSupabaseConfigured } from "@/utils/supabase/env";
import { createClient } from "@/utils/supabase/server";

/**
 * Cobro con tarjeta desde /pago (Stripe).
 * Los datos de la tarjeta nunca llegan aquí: el navegador los manda directo
 * a Stripe con Stripe Elements. Este servidor solo fija el importe (desde la
 * base de datos) y verifica el resultado con Stripe.
 */

export type StartCardPaymentResult =
  | { ok: true; clientSecret: string; orderNumber: number }
  | { ok: false; error: string };

export async function startCardPayment(input: OrderRequest): Promise<StartCardPaymentResult> {
  const parsed = orderRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Pedido inválido" };
  const { checkout, note, items } = parsed.data;
  if (!checkout || checkout.paymentMethod !== "card" || !checkout.email) {
    return { ok: false, error: "Completa tus datos para pagar con tarjeta." };
  }

  const stripe = getStripe();
  if (!stripe || !isSupabaseConfigured()) {
    return { ok: false, error: "El pago con tarjeta no está disponible en este momento. Puedes pedir por WhatsApp." };
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return { ok: false, error: "Tu sesión expiró. Vuelve a ingresar para pagar." };

  // Precios y total salen de la base de datos (ADR-003)
  const currency = siteConfig.currency.toUpperCase();
  const { data, error } = await supabase.rpc("create_order", {
    p_items: items,
    p_note: getCheckoutOrderNote(checkout, note),
    p_channel: "stripe",
    p_currency: currency,
  });
  if (error || !data) {
    console.error("[pago] create_order falló:", error?.message);
    return {
      ok: false,
      error:
        error?.code === "P0002"
          ? "Un producto del carrito ya no está disponible. Quítalo y vuelve a intentarlo."
          : "No se pudo registrar el pedido. Inténtalo de nuevo.",
    };
  }

  const order = data as unknown as CreatedOrder;
  const total = Number(order.total);
  if (order.has_unpriced_items || !(total > 0)) {
    return { ok: false, error: "Hay productos con precio a consultar: elige «Pedir por WhatsApp»." };
  }

  try {
    const intent = await stripe.paymentIntents.create(
      {
        amount: toStripeAmount(total, order.currency),
        currency: order.currency.toLowerCase(),
        allowed_payment_method_types: ["card"],
        description: `Pedido #${order.number} · IQONIC WELLNESS`,
        receipt_email: checkout.email,
        metadata: { source: PAYMENT_SOURCE, order_id: order.id, order_number: String(order.number) },
      },
      // Si la petición se reintenta por un corte de red, Stripe no crea un segundo cobro
      { idempotencyKey: `order-${order.id}` },
    );
    if (!intent.client_secret) throw new Error("PaymentIntent sin client_secret");
    return { ok: true, clientSecret: intent.client_secret, orderNumber: order.number };
  } catch (err) {
    console.error("[pago] Stripe no creó el pago:", err instanceof Error ? err.message : err);
    return { ok: false, error: "No pudimos iniciar el pago. Inténtalo de nuevo en unos minutos." };
  }
}

export type CompleteCardPaymentResult = { ok: true; orderNumber: number } | { ok: false; error: string };

/**
 * Después de que Stripe aprueba el pago en el navegador: se vuelve a leer el
 * PaymentIntent desde Stripe (no se confía en el navegador) y se registra.
 */
export async function completeCardPayment(paymentIntentId: string): Promise<CompleteCardPaymentResult> {
  const stripe = getStripe();
  if (!stripe || !/^pi_[A-Za-z0-9]+$/.test(paymentIntentId)) return { ok: false, error: "Pago inválido" };

  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const result = await recordStripePayment(intent);
    return result.ok ? { ok: true, orderNumber: result.orderNumber } : result;
  } catch (err) {
    console.error("[pago] No se pudo verificar el pago:", err instanceof Error ? err.message : err);
    return { ok: false, error: "No pudimos verificar el pago" };
  }
}
