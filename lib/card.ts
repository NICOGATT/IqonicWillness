/**
 * Utilidades del formulario de tarjeta (solo en el navegador, para la vista previa).
 *
 * ⚠️ Los datos de la tarjeta NUNCA se envían a nuestro servidor. Cuando se
 * conecte Stripe, estos campos se reemplazan por Stripe Elements (el número
 * viaja directo a Stripe); la vista previa usará la marca, el nombre y la fecha.
 */

export type CardBrand = "visa" | "mastercard" | "amex" | "unknown";

export interface CardFields {
  number: string;
  holder: string;
  expiry: string;
  cvc: string;
}

export const EMPTY_CARD: CardFields = { number: "", holder: "", expiry: "", cvc: "" };

const digits = (value: string) => value.replace(/\D/g, "");

export function detectBrand(number: string): CardBrand {
  const n = digits(number);
  if (/^4/.test(n)) return "visa";
  if (/^3[47]/.test(n)) return "amex";
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(n)) return "mastercard";
  return "unknown";
}

export const BRAND_LABEL: Record<CardBrand, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  unknown: "Tarjeta",
};

export function cardLength(brand: CardBrand): number {
  return brand === "amex" ? 15 : 16;
}

export function cvcLength(brand: CardBrand): number {
  return brand === "amex" ? 4 : 3;
}

/** Grupos de dígitos: Amex 4-6-5, el resto 4-4-4-4. */
function groups(brand: CardBrand): number[] {
  return brand === "amex" ? [4, 6, 5] : [4, 4, 4, 4];
}

/** "4242424242424242" → "4242 4242 4242 4242" (corta al largo de la marca). */
export function formatCardNumber(value: string): string {
  const brand = detectBrand(value);
  const n = digits(value).slice(0, cardLength(brand));
  const parts: string[] = [];
  let i = 0;
  for (const size of groups(brand)) {
    if (i >= n.length) break;
    parts.push(n.slice(i, i + size));
    i += size;
  }
  return parts.join(" ");
}

/** Número para la tarjeta dibujada: los dígitos que faltan se ven como "•". */
export function previewCardNumber(value: string): string[] {
  const brand = detectBrand(value);
  const n = digits(value).padEnd(cardLength(brand), "•");
  const parts: string[] = [];
  let i = 0;
  for (const size of groups(brand)) {
    parts.push(n.slice(i, i + size));
    i += size;
  }
  return parts;
}

/** "1228" → "12/28". */
export function formatExpiry(value: string): string {
  let n = digits(value).slice(0, 4);
  // "4" → "04": un mes de un dígito mayor que 1 se completa solo
  if (n.length === 1 && Number(n) > 1) n = `0${n}`;
  return n.length > 2 ? `${n.slice(0, 2)}/${n.slice(2)}` : n;
}

function passesLuhn(number: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = number.length - 1; i >= 0; i--) {
    let d = Number(number[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

export type CardErrors = Partial<Record<keyof CardFields, string>>;

export function validateCard(card: CardFields, now = new Date()): CardErrors {
  const errors: CardErrors = {};
  const brand = detectBrand(card.number);
  const n = digits(card.number);

  if (!n) errors.number = "Escribe el número de la tarjeta";
  else if (n.length !== cardLength(brand) || !passesLuhn(n)) errors.number = "El número de tarjeta no es válido";

  if (card.holder.trim().length < 3) errors.holder = "Escribe el nombre como figura en la tarjeta";

  const [mm, yy] = card.expiry.split("/");
  const month = Number(mm);
  const year = 2000 + Number(yy);
  if (!mm || !yy || yy.length !== 2 || month < 1 || month > 12) errors.expiry = "Usa el formato MM/AA";
  else if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1))
    errors.expiry = "La tarjeta está vencida";

  if (digits(card.cvc).length !== cvcLength(brand)) errors.cvc = `${cvcLength(brand)} dígitos`;

  return errors;
}
