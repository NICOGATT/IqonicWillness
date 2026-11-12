import "server-only";

import type { AdminSession } from "@/lib/auth";
import type { CustomerRow, PackageWithItemsRow } from "@/types/database";
import { rowToProduct } from "@/lib/product-mapper";
import type { Product } from "@/types/product";

type AdminClient = Extract<AdminSession, { status: "admin" }>["supabase"];

/**
 * Lista completa para el panel (incluye productos ocultos).
 * Sin caché: el admin siempre ve el estado real de la base de datos.
 * Recibe el cliente ya autenticado para que solo se pueda llamar tras getAdminSession().
 */
export async function getAllProductsForAdmin(supabase: AdminClient): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(`No se pudieron cargar los productos: ${error.message}`);
  return data.map(rowToProduct);
}

/**
 * Paquetes con su contenido (incluye ocultos), desde la vista packages_with_items.
 * Devuelve null si la migración 0003 todavía no se ejecutó.
 */
export async function getAllPackagesForAdmin(supabase: AdminClient): Promise<PackageWithItemsRow[] | null> {
  const { data, error } = await supabase
    .from("packages_with_items")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    // PGRST205 / 42P01: la vista no existe (falta ejecutar la migración)
    if (error.code === "PGRST205" || error.code === "42P01") return null;
    throw new Error(`No se pudieron cargar los paquetes: ${error.message}`);
  }
  return data;
}

/**
 * Clientes registrados (más recientes primero).
 * RLS solo devuelve todas las filas si el usuario está en `admins`.
 * Nunca incluye contraseñas: no existen en esta tabla.
 */
export async function getCustomersForAdmin(supabase: AdminClient): Promise<CustomerRow[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) throw new Error(`No se pudieron cargar los clientes: ${error.message}`);
  return data;
}
