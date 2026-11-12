import { z } from "zod";

import { slugify } from "@/lib/product-mapper";
import { BENEFIT_ICONS } from "@/types/product";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color hexadecimal inválido (ej. #FFA51F)");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .transform((v) => (v === "" ? null : v));

/** Esquema del formulario de producto del panel de administración. */
export const productFormSchema = z
  .object({
    id: z.string().trim().optional().transform((v) => (v ? v : undefined)),
    name: z.string().trim().min(2, "Escribe el nombre").max(80, "Máximo 80 caracteres"),
    slug: z.string().trim().max(80, "Máximo 80 caracteres"),
    description: optionalText(400),
    type: z.string().trim().min(2, "Escribe el tipo o línea").max(80, "Máximo 80 caracteres"),
    badge: optionalText(40),
    category: z.enum(["gummies", "energy", "hydration"], { message: "Elige una categoría" }),
    flavor: z.string().trim().min(2, "Escribe el sabor").max(60, "Máximo 60 caracteres"),
    presentation_label: z.string().trim().min(2, "Escribe la presentación").max(60, "Máximo 60 caracteres"),
    presentation_detail: optionalText(80),
    price: z
      .string()
      .trim()
      .transform((v) => v.replace(",", "."))
      .refine((v) => v === "" || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) >= 0), "Precio inválido (ej. 29.90)")
      .transform((v) => (v === "" ? null : Number(v))),
    image_url: z
      .string()
      .trim()
      .max(500, "URL demasiado larga")
      .refine((v) => v === "" || /^(https?:\/\/|\/)\S+$/.test(v), "Debe empezar por https:// o /")
      .transform((v) => (v === "" ? null : v)),
    accent_from: hexColor,
    accent_to: hexColor,
    featured: z.boolean(),
    is_active: z.boolean(),
    sort_order: z.coerce.number().int("Debe ser un número entero").min(0).max(100000),
    benefits: z
      .array(z.object({ icon: z.enum(BENEFIT_ICONS), label: z.string().trim().min(1).max(40, "Máximo 40 caracteres") }))
      .max(6, "Máximo 6 beneficios"),
  })
  .transform((data) => ({
    ...data,
    // Si no se escribe slug, se genera a partir de nombre + sabor
    slug: slugify(data.slug || `${data.name} ${data.flavor}`),
  }))
  .refine((data) => data.slug.length >= 2, { message: "Slug inválido", path: ["slug"] });

export type ProductFormValues = z.output<typeof productFormSchema>;

/** Convierte el FormData del formulario en un objeto para validar. */
export function formDataToProductInput(formData: FormData) {
  const text = (key: string) => String(formData.get(key) ?? "");
  const icons = formData.getAll("benefit_icon").map(String);
  const labels = formData.getAll("benefit_label").map((v) => String(v).trim());

  return {
    id: text("id"),
    name: text("name"),
    slug: text("slug"),
    description: text("description"),
    type: text("type"),
    badge: text("badge"),
    category: text("category"),
    flavor: text("flavor"),
    presentation_label: text("presentation_label"),
    presentation_detail: text("presentation_detail"),
    price: text("price"),
    image_url: text("image_url"),
    accent_from: text("accent_from"),
    accent_to: text("accent_to"),
    featured: formData.get("featured") === "on",
    is_active: formData.get("is_active") === "on",
    sort_order: text("sort_order") || "0",
    // Las filas sin texto se descartan
    benefits: labels.map((label, i) => ({ icon: icons[i], label })).filter((b) => b.label !== ""),
  };
}

/** Errores de zod → { campo: "mensaje" } (primer error por campo). */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    fieldErrors[key] ??= issue.message;
  }
  return fieldErrors;
}
