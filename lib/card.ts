/**
 * Marca de la tarjeta para la vista previa.
 *
 * ⚠️ Los datos de la tarjeta NUNCA pasan por nuestro código: los campos son
 * Stripe Elements (iframes de Stripe). De ellos solo sabemos la marca y si
 * cada campo está completo, que es lo que dibuja la tarjeta.
 */

export type CardBrand = "visa" | "mastercard" | "amex" | "unknown";

export const BRAND_LABEL: Record<CardBrand, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  unknown: "Tarjeta",
};

/** Stripe informa "visa", "mastercard", "amex", "discover", "unknown"… */
export function toCardBrand(stripeBrand: string | undefined): CardBrand {
  return stripeBrand === "visa" || stripeBrand === "mastercard" || stripeBrand === "amex" ? stripeBrand : "unknown";
}

export function cardLength(brand: CardBrand): number {
  return brand === "amex" ? 15 : 16;
}

export function cvcLength(brand: CardBrand): number {
  return brand === "amex" ? 4 : 3;
}

/** Grupos de puntos como en la tarjeta real: Amex 4-6-5, el resto 4-4-4-4. */
export function maskedCardGroups(brand: CardBrand): string[] {
  const sizes = brand === "amex" ? [4, 6, 5] : [4, 4, 4, 4];
  return sizes.map((size) => "•".repeat(size));
}
