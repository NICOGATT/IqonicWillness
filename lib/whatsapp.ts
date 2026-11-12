import { siteConfig } from "@/config/site";
import type { Product } from "@/types/product";

/**
 * Construye un enlace wa.me con el mensaje prellenado.
 * `encodeURIComponent` codifica espacios, tildes, ñ, paréntesis, "&", "?", etc.
 */
export function buildWhatsAppUrl(message: string, phone: string = siteConfig.whatsappNumber): string {
  const cleanPhone = phone.replace(/\D/g, "") || phone;
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/** Mensaje específico de un producto: "Hola, quiero consultar por el producto: IGNITE (Amazon Punch)". */
export function getProductMessage(product: Pick<Product, "name" | "flavor">): string {
  return `Hola, quiero consultar por el producto: ${product.name} (${product.flavor})`;
}

export function getProductWhatsAppUrl(product: Pick<Product, "name" | "flavor">): string {
  return buildWhatsAppUrl(getProductMessage(product));
}
