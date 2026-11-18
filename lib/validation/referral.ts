import { z } from "zod";

import { orderRequestSchema } from "@/lib/checkout";

/**
 * Validación de referidos (lógica pura: sirve en el proxy, Server Actions y
 * formularios). Las mismas reglas están en la base de datos como CHECK
 * (supabase/migrations/0005_referrals.sql): esto solo da mejores mensajes.
 */

export const SLUG_MIN = 3;
export const SLUG_MAX = 40;
/** Minúsculas, números y guiones; sin guion al inicio/fin ni dobles. */
export const REFERRAL_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Solo dígitos con código de país (E.164 sin "+"). */
export const WHATSAPP_REGEX = /^[0-9]{8,15}$/;

/**
 * Slugs que podrían hacerse pasar por la marca o por una sección del sitio.
 * Se controlan en la app (no en la BD) para poder ajustar la lista sin migrar.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "admin",
  "api",
  "iqonic",
  "iqonic-wellness",
  "iqonicwellness",
  "oficial",
  "soporte",
  "tienda",
  "ventas",
  "wellness",
]);

/** Formato válido (sin mirar si está libre). Útil para descartar cookies o enlaces basura. */
export function isValidSlugFormat(value: string): boolean {
  return value.length >= SLUG_MIN && value.length <= SLUG_MAX && REFERRAL_SLUG_REGEX.test(value);
}

/**
 * Sugerencia de slug a partir de un nombre: "Juan Pérez" → "juan-perez".
 * Para la UI (autocompletar); el servidor valida, no transforma.
 */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/, "");
}

/**
 * Deja solo los dígitos: "+54 9 11 2345-6789" → "5491123456789".
 * Quita también el prefijo internacional "00" ("0054…" → "54…").
 */
export function normalizeWhatsApp(value: string): string {
  return value.replace(/\D/g, "").replace(/^00/, "");
}

export const distributorProfileSchema = z.object({
  slug: z
    .string({ error: "Elige un nombre para tu enlace" })
    .trim()
    .toLowerCase()
    .min(SLUG_MIN, `Mínimo ${SLUG_MIN} caracteres`)
    .max(SLUG_MAX, `Máximo ${SLUG_MAX} caracteres`)
    .regex(REFERRAL_SLUG_REGEX, "Usa solo minúsculas, números y guiones (ej. juan-perez), sin espacios")
    .refine((slug) => !RESERVED_SLUGS.has(slug), "Ese nombre está reservado, elige otro"),
  nombre_mostrar: z
    .string({ error: "Escribe el nombre que verán tus clientes" })
    .trim()
    .min(2, "Mínimo 2 caracteres")
    .max(80, "Máximo 80 caracteres"),
  whatsapp: z
    .string({ error: "Escribe tu número de WhatsApp" })
    .transform(normalizeWhatsApp)
    .pipe(
      z
        .string()
        .regex(WHATSAPP_REGEX, "Número inválido: incluye el código de país, solo dígitos (ej. 5491123456789)"),
    ),
});

export type DistributorProfileInput = z.input<typeof distributorProfileSchema>;
export type DistributorProfileData = z.output<typeof distributorProfileSchema>;
export type DistributorProfileField = keyof DistributorProfileInput;

/**
 * Pedido referido = el mismo pedido del carrito / de /pago + datos opcionales
 * del comprador cuando no pasa por /pago (que ya trae nombre y teléfono).
 */
export const referralOrderSchema = orderRequestSchema.extend({
  cliente: z
    .object({
      nombre: z.string().trim().max(120, "Máximo 120 caracteres").optional(),
      telefono: z
        .string()
        .trim()
        .max(30, "Máximo 30 caracteres")
        .refine((v) => v === "" || /^[0-9]{7,15}$/.test(normalizeWhatsApp(v)), "Escribe un teléfono válido")
        .optional(),
    })
    .optional(),
});

export type ReferralOrderInput = z.input<typeof referralOrderSchema>;
