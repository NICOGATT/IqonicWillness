import { siteConfig } from "@/config/site";
import { formatPrice } from "@/lib/format";
import type { ProductPackage } from "@/types/package";
import type { Product } from "@/types/product";

/**
 * Modelo del carrito (lógica pura, sin React ni localStorage).
 * El estado vive en lib/cart-store.ts; aquí están los tipos, los totales
 * y el mensaje que se envía por WhatsApp.
 */

export type CartItemKind = "product" | "package";

export interface CartItem {
  /** `${kind}:${id}` — identifica la línea del carrito. */
  key: string;
  kind: CartItemKind;
  id: string;
  name: string;
  /** Sabor (producto) o contenido (paquete). */
  detail: string | null;
  /** Precio unitario en el momento de agregarlo; null = "a consultar". */
  price: number | null;
  quantity: number;
  /** Color de acento para el punto de color del panel. */
  accent: string;
  /** Enlace para volver a la ficha. */
  href: string;
}

export type CartItemInput = Omit<CartItem, "quantity">;

export const MAX_QUANTITY = 99;

export function productToCartItem(product: Product): CartItemInput {
  return {
    key: `product:${product.id}`,
    kind: "product",
    id: product.id,
    name: product.name,
    detail: product.flavor,
    price: product.price,
    accent: product.accent.from,
    href: `/productos/${product.slug}`,
  };
}

export function packageToCartItem(pkg: ProductPackage): CartItemInput {
  return {
    key: `package:${pkg.id}`,
    kind: "package",
    id: pkg.id,
    name: pkg.name,
    detail: pkg.items.map((i) => `${i.quantity}× ${i.name} ${i.flavor}`).join(" + "),
    price: pkg.price,
    accent: "#9d5cff",
    href: "/#paquetes",
  };
}

export function getItemCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export interface CartTotals {
  /** Suma de las líneas con precio. */
  total: number;
  /** Hay líneas sin precio ("a consultar"), así que el total es parcial. */
  hasUnpriced: boolean;
}

export function getCartTotals(items: CartItem[]): CartTotals {
  let total = 0;
  let hasUnpriced = false;
  for (const item of items) {
    if (item.price === null) hasUnpriced = true;
    else total += item.price * item.quantity;
  }
  // Evita arrastrar decimales de punto flotante (24.9 * 3 = 74.69999…)
  return { total: Math.round(total * 100) / 100, hasUnpriced };
}

export interface OrderMessageLine {
  kind: CartItemKind;
  name: string;
  detail: string | null;
  unitPrice: number | null;
  quantity: number;
}

export interface OrderMessageInput {
  lines: OrderMessageLine[];
  total: number;
  hasUnpriced: boolean;
  note?: string | null;
  /** Número del pedido guardado en Supabase (#1001). */
  orderNumber?: number | null;
  /** Nombre del cliente si inició sesión. */
  contactName?: string | null;
}

/**
 * Mensaje del pedido para WhatsApp:
 *
 *   Hola, soy Ana Pérez y quiero hacer este pedido (#1042):
 *
 *   1. IGNITE (Amazon Punch) × 2 — US$49.80
 *   2. Paquete Pack Energía Total × 1 — US$39.90
 *      Incluye: 1× IGNITE Amazon Punch + 1× DAILY SHOTS Lemon Splash
 *
 *   Total: US$89.70
 */
export function buildOrderMessage({ lines, total, hasUnpriced, note, orderNumber, contactName }: OrderMessageInput): string {
  if (lines.length === 0) return siteConfig.generalMessage;

  const body = lines.map((item, index) => {
    const label =
      item.kind === "package" ? `Paquete ${item.name}` : item.detail ? `${item.name} (${item.detail})` : item.name;
    const price = item.unitPrice === null ? "precio a consultar" : formatPrice(item.unitPrice * item.quantity);
    const line = `${index + 1}. ${label} × ${item.quantity} — ${price}`;
    return item.kind === "package" && item.detail ? `${line}\n   Incluye: ${item.detail}` : line;
  });

  const totalLine = hasUnpriced
    ? `Total estimado: ${formatPrice(total)} (+ productos a consultar)`
    : `Total: ${formatPrice(total)}`;

  const greeting = contactName ? `Hola, soy ${contactName} y quiero hacer este pedido` : "Hola, quiero hacer este pedido";
  const header = orderNumber ? `${greeting} (#${orderNumber}):` : `${greeting}:`;

  const parts = [header, body.join("\n"), totalLine];
  const cleanNote = note?.trim();
  if (cleanNote) parts.push(`Comentario: ${cleanNote}`);
  return parts.join("\n\n");
}

/** Mensaje con los datos del navegador (respaldo si no se pudo guardar el pedido). */
export function getCartMessage(items: CartItem[], note = ""): string {
  const { total, hasUnpriced } = getCartTotals(items);
  return buildOrderMessage({
    lines: items.map((i) => ({ kind: i.kind, name: i.name, detail: i.detail, unitPrice: i.price, quantity: i.quantity })),
    total,
    hasUnpriced,
    note,
  });
}
