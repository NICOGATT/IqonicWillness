import { siteConfig } from "@/config/site";
import type { OrderChannel, OrderStatus } from "@/types/database";

/** Textos y colores de los estados de un pedido (panel y, más adelante, /cuenta). */
export const ORDER_STATUS_META: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "border-brand-gold/30 bg-brand-gold/10 text-brand-gold" },
  confirmed: { label: "Confirmado", className: "border-sky-400/30 bg-sky-400/10 text-sky-300" },
  paid: { label: "Pagado", className: "border-wa/30 bg-wa/10 text-wa" },
  shipped: { label: "Enviado", className: "border-brand-violet/30 bg-brand-violet/10 text-brand-violet-light" },
  delivered: { label: "Entregado", className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" },
  cancelled: { label: "Cancelado", className: "border-white/10 bg-white/5 text-zinc-400" },
  refunded: { label: "Reembolsado", className: "border-red-400/30 bg-red-400/10 text-red-300" },
};

export const ORDER_CHANNEL_LABEL: Record<OrderChannel, string> = {
  whatsapp: "WhatsApp",
  stripe: "Tarjeta (Stripe)",
  mercadopago: "Mercado Pago",
  manual: "Manual",
};

/** Precio en la moneda guardada en el pedido (no en la actual del sitio). */
export function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(siteConfig.locale, { style: "currency", currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}
