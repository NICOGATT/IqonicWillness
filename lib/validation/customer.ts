import { z } from "zod";

import { normalizeWhatsApp, WHATSAPP_REGEX } from "@/lib/validation/referral";

/** Reglas compartidas de los formularios de clientes. */

const name = (label: string) =>
  z.string().trim().min(1, `Escribe tu ${label}`).max(60, "Máximo 60 caracteres");

export const phoneSchema = z
  .string()
  .trim()
  // Permite escribir espacios, guiones o paréntesis; se guardan solo los dígitos
  .transform((v) => v.replace(/[\s\-().]/g, ""))
  .refine((v) => /^\+?[0-9]{7,15}$/.test(v), "Teléfono inválido (7 a 15 dígitos, puede empezar con +)");

export const birthDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Elige tu fecha de nacimiento")
  .refine((v) => {
    const date = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && v >= "1900-01-01" && date.getTime() <= Date.now();
  }, "Fecha inválida");

export const passwordSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .max(72, "Máximo 72 caracteres")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Usa al menos una letra y un número");

export const profileSchema = z.object({
  first_name: name("nombre"),
  last_name: name("apellido"),
  phone: phoneSchema,
  birth_date: birthDateSchema,
});

/* ------------------------------ iqonic_id ------------------------------ */

/**
 * ID de distribuidor de IQONIC. Misma regla que el CHECK
 * customers_iqonic_id_formato (supabase/migrations/0006_roles_iqonic_id.sql).
 */
export const IQONIC_ID_REGEX = /^[A-Z0-9_-]{3,40}$/;

/** Igual que public.normalize_iqonic_id(): sin espacios a los lados y en mayúsculas. */
export function normalizeIqonicId(value: string): string {
  return value.trim().toUpperCase();
}

export const iqonicIdSchema = z
  .string()
  .transform(normalizeIqonicId)
  .refine((v) => v.length > 0, "Escribe tu Iqonic ID")
  .refine(
    (v) => v.length === 0 || IQONIC_ID_REGEX.test(v),
    "Iqonic ID inválido: de 3 a 40 letras, números, guiones o guiones bajos",
  );

/** Roles que alguien puede elegir al registrarse ("admin" nunca). */
export const SIGN_UP_ROLES = ["client", "distributor"] as const;
export type SignUpRole = (typeof SIGN_UP_ROLES)[number];

export const signUpSchema = profileSchema
  .extend({
    email: z.email("Correo inválido").transform((v) => v.toLowerCase()),
    password: passwordSchema,
    password_confirm: z.string(),
    role: z.enum(SIGN_UP_ROLES, { error: "Elige cómo quieres registrarte" }),
    // Solo cuentan si role = "distributor" (ver superRefine)
    iqonic_id: z.string().default(""),
    whatsapp: z.string().default(""),
  })
  .superRefine((d, ctx) => {
    if (d.password !== d.password_confirm) {
      ctx.addIssue({ code: "custom", message: "Las contraseñas no coinciden", path: ["password_confirm"] });
    }
    if (d.role !== "distributor") return;

    const iqonic = iqonicIdSchema.safeParse(d.iqonic_id);
    if (!iqonic.success) {
      ctx.addIssue({ code: "custom", message: iqonic.error.issues[0].message, path: ["iqonic_id"] });
    }
    if (!WHATSAPP_REGEX.test(normalizeWhatsApp(d.whatsapp))) {
      ctx.addIssue({
        code: "custom",
        message: "WhatsApp inválido: incluye el código de país (ej. 5491123456789)",
        path: ["whatsapp"],
      });
    }
  })
  .transform((d) => {
    const whatsapp = normalizeWhatsApp(d.whatsapp);
    return {
      ...d,
      // Un cliente nunca guarda iqonic_id (el CHECK de la BD lo rechazaría)
      iqonic_id: d.role === "distributor" ? normalizeIqonicId(d.iqonic_id) : null,
      whatsapp: WHATSAPP_REGEX.test(whatsapp) ? whatsapp : null,
    };
  });

export type SignUpData = z.output<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.email("Correo inválido"),
  password: z.string().min(1, "Escribe tu contraseña"),
});

export const newPasswordSchema = z
  .object({ password: passwordSchema, password_confirm: z.string() })
  .refine((d) => d.password === d.password_confirm, {
    message: "Las contraseñas no coinciden",
    path: ["password_confirm"],
  });

/** FormData → objeto plano de strings. */
export function formToObject(formData: FormData, keys: string[]) {
  return Object.fromEntries(keys.map((k) => [k, String(formData.get(k) ?? "")]));
}
