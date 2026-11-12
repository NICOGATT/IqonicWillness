import "server-only";

import type { AdminSession } from "@/lib/auth";
import type { CustomerRow } from "@/types/database";
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
