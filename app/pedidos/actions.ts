"use server";

import { z } from "zod";

import { siteConfig } from "@/config/site";
import { buildOrderMessage, MAX_QUANTITY } from "@/lib/cart";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import type { CreatedOrder } from "@/types/database";
import { isSupabaseConfigured } from "@/utils/supabase/env";
import { createClient } from "@/utils/supabase/server";

/**
 * Pedido por WhatsApp desde el carrito.
 * 1. Guarda el pedido en Supabase con create_order(): los precios y el total
 *    salen de la base de datos, no del navegador (ADR-003).
 * 2. Devuelve el enlace de WhatsApp con el número de pedido (#1042).
 *
 * Si algo falla, el carrito usa su propio mensaje para no perder la venta.
 */

const orderInputSchema = z.object({
  items: z
    .array(
      z.object({
        kind: z.enum(["product", "package"]),
        id: z.uuid(),
        quantity: z.number().int().min(1).max(MAX_QUANTITY),
      }),
    )
    .min(1, "El carrito está vacío")
    .max(30, "Máximo 30 productos distintos por pedido"),
  note: z.string().trim().max(300).optional(),
});

export type WhatsAppOrderInput = z.input<typeof orderInputSchema>;

export type WhatsAppOrderResult =
  | { ok: true; orderNumber: number; whatsappUrl: string }
  /**
   * unavailable → un producto ya no existe: avisar y no abrir WhatsApp.
   * failed      → error técnico: el carrito manda su propio mensaje igual.
   */
  | { ok: false; reason: "invalid" | "unavailable" | "failed"; error: string };

export async function createWhatsAppOrder(input: WhatsAppOrderInput): Promise<WhatsAppOrderResult> {
  const parsed = orderInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, reason: "invalid", error: parsed.error.issues[0]?.message ?? "Pedido inválido" };
  }
  if (!isSupabaseConfigured()) return { ok: false, reason: "failed", error: "Supabase no está configurado" };

  // Cliente con cookies: si hay sesión, create_order vincula el pedido al cliente
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_order", {
    p_items: parsed.data.items,
    p_note: parsed.data.note || null,
    p_channel: "whatsapp",
    p_currency: siteConfig.currency.toUpperCase(),
  });

  if (error || !data) {
    console.error("[pedidos] create_order falló:", error?.message);
    // P0002 = un producto se desactivó o borró mientras estaba en el carrito
    return error?.code === "P0002"
      ? {
          ok: false,
          reason: "unavailable",
          error: "Un producto del carrito ya no está disponible. Quítalo y vuelve a intentarlo.",
        }
      : { ok: false, reason: "failed", error: "No se pudo registrar el pedido." };
  }

  const order = data as unknown as CreatedOrder;
  const message = buildOrderMessage({
    orderNumber: order.number,
    contactName: order.contact_name,
    lines: order.items.map((i) => ({
      kind: i.kind,
      name: i.name,
      detail: i.detail,
      unitPrice: i.unit_price === null ? null : Number(i.unit_price),
      quantity: i.quantity,
    })),
    total: Number(order.total),
    hasUnpriced: order.has_unpriced_items,
    note: order.customer_note,
  });

  return { ok: true, orderNumber: order.number, whatsappUrl: buildWhatsAppUrl(message) };
}
