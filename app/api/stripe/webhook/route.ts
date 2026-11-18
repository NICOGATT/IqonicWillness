import type Stripe from "stripe";

import { getStripe, PAYMENT_SOURCE, recordStripePayment } from "@/lib/stripe";

/**
 * POST /api/stripe/webhook — Stripe avisa aquí cuando se cobra un pedido.
 * Cubre el caso en que el cliente cierra la pestaña antes de volver a la web.
 *
 * Local:  stripe listen --forward-to localhost:3000/api/stripe/webhook
 *         → copiar el whsec_… a STRIPE_WEBHOOK_SECRET
 * Producción: Stripe → Webhooks → evento payment_intent.succeeded.
 */
export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !secret) return Response.json({ error: "Webhook de Stripe no configurado" }, { status: 503 });

  // La firma se calcula sobre el cuerpo SIN parsear
  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, request.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return Response.json({ error: "Firma inválida" }, { status: 400 });
  }

  // Los pagos que no son de /pago (p. ej. Stripe Checkout de la API Express) se ignoran
  if (event.type === "payment_intent.succeeded" && event.data.object.metadata.source === PAYMENT_SOURCE) {
    const result = await recordStripePayment(event.data.object);
    // Error → 500 para que Stripe reintente más tarde
    if (!result.ok) return Response.json({ error: result.error }, { status: 500 });
  }

  return Response.json({ received: true });
}
