"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getAdminSession } from "@/lib/auth";
import { createUploadSignature, type CloudinaryUploadSignature } from "@/lib/cloudinary";
import { PRODUCTS_CACHE_TAG } from "@/lib/products";
import { formDataToProductInput, productFormSchema, toFieldErrors } from "@/lib/validation/product";
import type { ProductInsert, ProductUpdate } from "@/types/database";
import { createClient } from "@/utils/supabase/server";

/**
 * Server Actions del panel.
 * Cada acción vuelve a comprobar que el usuario es admin (no confiamos en el
 * cliente) y RLS lo vuelve a comprobar en la base de datos.
 */

export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

// ---------------------------------------------------------------------
// Autenticación
// ---------------------------------------------------------------------

const loginSchema = z.object({
  email: z.email("Correo inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Mensaje genérico: no revelamos si el correo existe
    return { status: "error", message: "Correo o contraseña incorrectos." };
  }
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

// ---------------------------------------------------------------------
// Productos
// ---------------------------------------------------------------------

async function requireAdminAction() {
  const session = await getAdminSession();
  if (session.status !== "admin") {
    return { ok: false as const, state: { status: "error", message: "No tienes permisos de administrador." } satisfies ActionState };
  }
  return { ok: true as const, supabase: session.supabase };
}

/** Invalida el catálogo público y refresca la vista del panel. */
function revalidateCatalog() {
  updateTag(PRODUCTS_CACHE_TAG);
  refresh();
}

/** Crea (sin id) o actualiza (con id) un producto. */
export async function saveProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const auth = await requireAdminAction();
  if (!auth.ok) return auth.state;

  const parsed = productFormSchema.safeParse(formDataToProductInput(formData));
  if (!parsed.success) {
    return { status: "error", message: "Revisa los campos marcados.", fieldErrors: toFieldErrors(parsed.error) };
  }

  const { id, ...values } = parsed.data;
  const { supabase } = auth;

  const result = id
    ? await supabase.from("products").update(values satisfies ProductUpdate).eq("id", id).select("id").single()
    : // packaging queda en null: la ilustración se genera a partir del nombre/categoría
      await supabase.from("products").insert({ ...values, packaging: null } satisfies ProductInsert).select("id").single();

  if (result.error) {
    if (result.error.code === "23505") {
      return { status: "error", message: "Ya existe un producto con ese slug.", fieldErrors: { slug: "Este slug ya está en uso" } };
    }
    console.error("[admin] saveProduct:", result.error);
    return { status: "error", message: "No se pudo guardar el producto. Inténtalo de nuevo." };
  }

  revalidateCatalog();
  return { status: "success", message: id ? "Producto actualizado." : "Producto creado." };
}

/**
 * Firma para que el panel suba una imagen directo a Cloudinary.
 * Solo admins: sin firma válida Cloudinary rechaza la subida.
 */
export async function getImageUploadSignature(): Promise<
  { ok: true; data: CloudinaryUploadSignature } | { ok: false; message: string }
> {
  const auth = await requireAdminAction();
  if (!auth.ok) return { ok: false, message: auth.state.message };

  const data = createUploadSignature();
  if (!data) {
    console.error("[admin] Cloudinary no configurado: faltan CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET");
    return { ok: false, message: "La subida de imágenes no está configurada (faltan las variables de Cloudinary)." };
  }
  return { ok: true, data };
}

export async function deleteProduct(id: string): Promise<ActionState> {
  const auth = await requireAdminAction();
  if (!auth.ok) return auth.state;

  if (!z.uuid().safeParse(id).success) return { status: "error", message: "Producto inválido." };

  const { error, count } = await auth.supabase.from("products").delete({ count: "exact" }).eq("id", id);
  if (error || count === 0) {
    console.error("[admin] deleteProduct:", error);
    return { status: "error", message: "No se pudo eliminar el producto." };
  }

  revalidateCatalog();
  return { status: "success", message: "Producto eliminado." };
}
