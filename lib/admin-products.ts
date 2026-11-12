import "server-only";

import type { AdminSession } from "@/lib/auth";
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
