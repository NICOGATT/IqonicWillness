import { z } from "zod";

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

export const signUpSchema = profileSchema
  .extend({
    email: z.email("Correo inválido").transform((v) => v.toLowerCase()),
    password: passwordSchema,
    password_confirm: z.string(),
  })
  .refine((d) => d.password === d.password_confirm, {
    message: "Las contraseñas no coinciden",
    path: ["password_confirm"],
  });

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
