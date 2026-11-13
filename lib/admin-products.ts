import "server-only";

import type { AdminSession } from "@/lib/auth";
import type { CustomerRow, OrderItemRow, OrderRow, PackageWithItemsRow } from "@/types/database";
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

export type AdminOrder = OrderRow & { items: OrderItemRow[] };

/**
 * Últimos pedidos con sus líneas (más recientes primero).
 * RLS solo devuelve todos si el usuario está en `admins`.
 * Devuelve null si falta la migración 0004_orders.sql.
 */
export async function getOrdersForAdmin(supabase: AdminClient): Promise<AdminOrder[] | null> {
  const { data: orders, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) {
    console.error("[admin] No se pudieron cargar los pedidos:", error.message);
    return null;
  }
  if (orders.length === 0) return [];

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("*")
    .in("order_id", orders.map((o) => o.id))
    .order("sort_order");
  if (itemsError) {
    console.error("[admin] No se pudieron cargar las líneas de los pedidos:", itemsError.message);
    return null;
  }

  const byOrder = new Map<string, OrderItemRow[]>();
  for (const item of items) byOrder.set(item.order_id, [...(byOrder.get(item.order_id) ?? []), item]);
  return orders.map((o) => ({
    ...o,
    subtotal: Number(o.subtotal),
    shipping: Number(o.shipping),
    total: Number(o.total),
    items: (byOrder.get(o.id) ?? []).map((i) => ({
      ...i,
      unit_price: i.unit_price === null ? null : Number(i.unit_price),
      line_total: i.line_total === null ? null : Number(i.line_total),
    })),
  }));
}
