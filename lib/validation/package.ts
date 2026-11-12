import { z } from "zod";

import { slugify } from "@/lib/product-mapper";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .transform((v) => (v === "" ? null : v));

export const MAX_PACKAGE_ITEMS = 12;

/** Esquema del formulario de paquete del panel de administración. */
export const packageFormSchema = z
  .object({
    id: z.string().trim().optional().transform((v) => (v ? v : undefined)),
    name: z.string().trim().min(2, "Escribe el nombre").max(80, "Máximo 80 caracteres"),
    slug: z.string().trim().max(80, "Máximo 80 caracteres"),
    description: optionalText(400),
    badge: optionalText(40),
    price: z
      .string()
      .trim()
      .transform((v) => v.replace(",", "."))
      .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Escribe el precio (ej. 59.90)")
      .transform(Number),
    image_url: z
      .string()
      .trim()
      .max(500, "URL demasiado larga")
      .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), "Debe empezar por https://")
      .transform((v) => (v === "" ? null : v)),
    featured: z.boolean(),
    is_active: z.boolean(),
    sort_order: z.coerce.number().int("Debe ser un número entero").min(0).max(100000),
    items: z
      .array(
        z.object({
          product_id: z.uuid("Elige un producto"),
          quantity: z.coerce.number().int("Cantidad entera").min(1, "Mínimo 1").max(20, "Máximo 20"),
        }),
      )
      .min(1, "Agrega al menos un producto")
      .max(MAX_PACKAGE_ITEMS, `Máximo ${MAX_PACKAGE_ITEMS} productos`)
      .refine((items) => new Set(items.map((i) => i.product_id)).size === items.length, {
        message: "Hay un producto repetido: usa la cantidad en vez de agregarlo dos veces",
      }),
  })
  .transform((data) => ({ ...data, slug: slugify(data.slug || data.name) }))
  .refine((data) => data.slug.length >= 2, { message: "Slug inválido", path: ["slug"] });

export type PackageFormValues = z.output<typeof packageFormSchema>;

/** Convierte el FormData del formulario en un objeto para validar. */
export function formDataToPackageInput(formData: FormData) {
  const text = (key: string) => String(formData.get(key) ?? "");
  const products = formData.getAll("item_product").map(String);
  const quantities = formData.getAll("item_quantity").map(String);

  return {
    id: text("id"),
    name: text("name"),
    slug: text("slug"),
    description: text("description"),
    badge: text("badge"),
    price: text("price"),
    image_url: text("image_url"),
    featured: formData.get("featured") === "on",
    is_active: formData.get("is_active") === "on",
    sort_order: text("sort_order") || "0",
    // Las filas sin producto elegido se descartan
    items: products
      .map((product_id, i) => ({ product_id, quantity: quantities[i] || "1" }))
      .filter((item) => item.product_id !== ""),
  };
}
