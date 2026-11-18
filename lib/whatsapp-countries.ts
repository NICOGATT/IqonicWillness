import { normalizeWhatsApp } from "@/lib/validation/referral";

/**
 * Códigos de país para el selector de WhatsApp del panel del distribuidor.
 * `prefix` son los dígitos que van delante del número local en wa.me
 * (Argentina lleva el 9 de celular: 54 9 11 2345-6789 → 5491123456789).
 */
export type WhatsAppCountry = {
  id: string;
  name: string;
  /** Dígitos que se anteponen al número local ("" = el usuario escribe el número completo). */
  prefix: string;
  /** Cómo se muestra: "+54 9". */
  label: string;
  /** Ejemplo de número local (placeholder). */
  example: string;
  /** Ayuda para no equivocarse con el formato. */
  hint: string;
};

export const WHATSAPP_COUNTRIES: readonly WhatsAppCountry[] = [
  { id: "ar", name: "Argentina", prefix: "549", label: "+54 9", example: "11 2345 6789", hint: "Código de área sin el 0 y número sin el 15." },
  { id: "us", name: "EE. UU. / Canadá", prefix: "1", label: "+1", example: "305 123 4567", hint: "Código de área + número (10 dígitos)." },
  { id: "mx", name: "México", prefix: "52", label: "+52", example: "55 1234 5678", hint: "Número de 10 dígitos, sin el 044 ni el 1." },
  { id: "es", name: "España", prefix: "34", label: "+34", example: "612 34 56 78", hint: "Número móvil de 9 dígitos." },
  { id: "cl", name: "Chile", prefix: "56", label: "+56", example: "9 1234 5678", hint: "Celular de 9 dígitos (empieza con 9)." },
  { id: "co", name: "Colombia", prefix: "57", label: "+57", example: "300 123 4567", hint: "Celular de 10 dígitos." },
  { id: "pe", name: "Perú", prefix: "51", label: "+51", example: "912 345 678", hint: "Celular de 9 dígitos." },
  { id: "uy", name: "Uruguay", prefix: "598", label: "+598", example: "94 123 456", hint: "Celular sin el 0 inicial." },
  { id: "py", name: "Paraguay", prefix: "595", label: "+595", example: "981 123 456", hint: "Celular sin el 0 inicial." },
  { id: "bo", name: "Bolivia", prefix: "591", label: "+591", example: "7123 4567", hint: "Celular de 8 dígitos." },
  { id: "ec", name: "Ecuador", prefix: "593", label: "+593", example: "99 123 4567", hint: "Celular sin el 0 inicial." },
  { id: "ve", name: "Venezuela", prefix: "58", label: "+58", example: "412 123 4567", hint: "Celular sin el 0 inicial." },
  { id: "br", name: "Brasil", prefix: "55", label: "+55", example: "11 91234 5678", hint: "DDD + número de celular." },
  { id: "other", name: "Otro país", prefix: "", label: "+", example: "Código de país + número", hint: "Escribe el número completo con el código de país." },
];

export const DEFAULT_COUNTRY_ID = "ar";
export const OTHER_COUNTRY_ID = "other";

export function getCountry(id: string): WhatsAppCountry {
  return WHATSAPP_COUNTRIES.find((c) => c.id === id) ?? WHATSAPP_COUNTRIES[0];
}

/** De más largo a más corto para que "549" gane sobre "54" o "5". */
const BY_PREFIX = WHATSAPP_COUNTRIES.filter((c) => c.prefix).sort((a, b) => b.prefix.length - a.prefix.length);

/** "5491123456789" → { countryId: "ar", local: "1123456789" }. Sin coincidencia → "Otro país". */
export function splitWhatsApp(full: string): { countryId: string; local: string } {
  const digits = normalizeWhatsApp(full);
  if (!digits) return { countryId: DEFAULT_COUNTRY_ID, local: "" };
  const country = BY_PREFIX.find((c) => digits.startsWith(c.prefix) && digits.length > c.prefix.length + 5);
  return country ? { countryId: country.id, local: digits.slice(country.prefix.length) } : { countryId: OTHER_COUNTRY_ID, local: digits };
}

/** Número local tal como lo escribió el usuario → dígitos listos para anteponer el prefijo. */
export function cleanLocalNumber(countryId: string, value: string): string {
  let digits = value.replace(/\D/g, "");
  // Error típico: el 0 de larga distancia nacional (011…, 09…)
  if (countryId !== OTHER_COUNTRY_ID) digits = digits.replace(/^0+/, "");
  return digits;
}

/** Número completo (solo dígitos, con código de país) que se guarda en la base de datos. */
export function joinWhatsApp(countryId: string, local: string): string {
  return `${getCountry(countryId).prefix}${cleanLocalNumber(countryId, local)}`;
}

/** Aviso específico de Argentina: el 15 delante del número no va en WhatsApp. */
export function getLocalNumberWarning(countryId: string, local: string): string | null {
  const digits = cleanLocalNumber(countryId, local);
  if (countryId === "ar") {
    // 11 15 2345 6789 / 351 15 234 5678 → sobra el 15
    if (/^(?:\d{2,4})15\d{6,8}$/.test(digits) && digits.length > 10) return "Parece que incluiste el 15: quítalo (WhatsApp ya usa el 9).";
    if (digits.length > 0 && digits.length !== 10) return "En Argentina son 10 dígitos: código de área + número.";
  }
  return null;
}
