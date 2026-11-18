import "server-only";

import Stripe from "stripe";

import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Stripe del lado del servidor (cobro con tarjeta desde /pago).
 *
 * Flujo:
 * 1. startCardPayment crea el pedido (create_order, precios de la BD) y un
 *    PaymentIntent por el total del pedido, con metadata.order_id.
 * 2. El navegador confirma el pago con Stripe Elements: el número de la
 *    tarjeta va directo a Stripe, nunca a este servidor.
 * 3. completeCardPayment y el webhook vuelven a leer el PaymentIntent desde
 *    Stripe (fuente de verdad) y marcan el pedido como pagado.
 */

let client: Stripe | null | undefined;

/** null si falta STRIPE_SECRET_KEY. */
export function getStripe(): Stripe | null {
  if (client === undefined) {
    const key = process.env.STRIPE_SECRET_KEY?.trim();
    client = key ? new Stripe(key) : null;
  }
  return client;
}

/** Monedas sin decimales: el importe va en unidades, no en centavos. */
const ZERO_DECIMAL = new Set(["bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"]);

const factor = (currency: string) => (ZERO_DECIMAL.has(currency.toLowerCase()) ? 1 : 100);

/** 20.00 USD → 2000 (centavos). */
export function toStripeAmount(amount: number, currency: string): number {
  return Math.round(amount * factor(currency));
}

export function fromStripeAmount(amount: number, currency: string): number {
  return amount / factor(currency);
}

/** Marca para reconocer los cobros de esta web en el webhook. */
export const PAYMENT_SOURCE = "iqonic-thrive";

export type RecordPaymentResult =
  | { ok: true; orderNumber: number; recorded: boolean }
  | { ok: false; error: string };

/**
 * Registra un PaymentIntent cobrado: inserta en payments y pasa el pedido a
 * "paid" (el trigger completa paid_at). Idempotente: el webhook y el
 * navegador pueden llamarlo los dos.
 *
 * Solo recibe PaymentIntents leídos desde la API de Stripe o desde un
 * webhook con firma verificada, nunca datos del navegador.
 */
export async function recordStripePayment(intent: Stripe.PaymentIntent): Promise<RecordPaymentResult> {
  if (intent.status !== "succeeded") return { ok: false, error: "El pago no está aprobado" };
  if (intent.metadata.source !== PAYMENT_SOURCE || !intent.metadata.order_id) {
    return { ok: false, error: "El pago no corresponde a un pedido de la tienda" };
  }
  const orderNumber = Number(intent.metadata.order_number) || 0;

  const admin = createAdminClient();
  if (!admin) {
    console.warn(
      `[stripe] Pago ${intent.id} aprobado, pero falta SUPABASE_SECRET_KEY: el pedido #${orderNumber} queda pendiente.`,
    );
    return { ok: true, orderNumber, recorded: false };
  }

  const { data: order, error } = await admin
    .from("orders")
    .select("id, number, total, currency, status")
    .eq("id", intent.metadata.order_id)
    .single();
  if (error || !order) return { ok: false, error: "No encontramos el pedido del pago" };

  // El importe cobrado tiene que ser exactamente el total del pedido
  if (
    intent.currency !== order.currency.toLowerCase() ||
    intent.amount_received !== toStripeAmount(Number(order.total), order.currency)
  ) {
    console.error(`[stripe] El pago ${intent.id} no coincide con el total del pedido #${order.number}.`);
    return { ok: false, error: "El importe cobrado no coincide con el pedido" };
  }

  const { error: paymentError } = await admin.from("payments").upsert(
    {
      order_id: order.id,
      provider: "stripe",
      provider_payment_id: intent.id,
      status: "succeeded",
      amount: fromStripeAmount(intent.amount_received, intent.currency),
      currency: intent.currency.toUpperCase(),
      raw: {
        id: intent.id,
        status: intent.status,
        amount_received: intent.amount_received,
        currency: intent.currency,
        created: intent.created,
        livemode: intent.livemode,
        latest_charge: typeof intent.latest_charge === "string" ? intent.latest_charge : (intent.latest_charge?.id ?? null),
      },
    },
    { onConflict: "provider_payment_id", ignoreDuplicates: true },
  );
  if (paymentError) {
    console.error("[stripe] No se pudo guardar el pago:", paymentError.message);
    return { ok: false, error: "No se pudo registrar el pago" };
  }

  if (order.status === "pending" || order.status === "confirmed") {
    const { error: orderError } = await admin.from("orders").update({ status: "paid" }).eq("id", order.id);
    if (orderError) {
      console.error("[stripe] No se pudo marcar el pedido como pagado:", orderError.message);
      return { ok: false, error: "No se pudo actualizar el pedido" };
    }
  }

  return { ok: true, orderNumber: order.number, recorded: true };
}
