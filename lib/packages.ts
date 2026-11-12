import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { PRODUCTS_CACHE_TAG } from "@/lib/products";
import type { PackageWithItemsRow } from "@/types/database";
import type { ProductPackage } from "@/types/package";
import { createPublicClient } from "@/utils/supabase/public";

const toNumber = (v: number | string | null) => (v === null ? null : Number(v));

function rowToPackage(row: PackageWithItemsRow): ProductPackage {
  const regularPrice = toNumber(row.regular_price);
  const savings = toNumber(row.savings);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    badge: row.badge,
    price: Number(row.price),
    imageUrl: row.image_url,
    featured: row.featured,
    items: (row.items ?? []).map((i) => ({
      productId: i.product_id,
      slug: i.slug,
      name: i.name,
      flavor: i.flavor,
      quantity: i.quantity,
      unitPrice: toNumber(i.unit_price),
    })),
    itemCount: row.item_count ?? 0,
    regularPrice,
    savings: savings !== null && savings > 0 ? savings : null,
  };
}

/**
 * Paquetes visibles para la tienda (RLS solo devuelve los activos).
 * Usa la misma etiqueta de caché que los productos: al guardar un producto
 * o un paquete en /admin, ambos se actualizan (cambian contenido y ahorro).
 * Si la migración 0003 aún no se ejecutó, devuelve [] y la sección no aparece.
 */
export async function getPackages(): Promise<ProductPackage[]> {
  "use cache";
  cacheTag(PRODUCTS_CACHE_TAG);
  cacheLife("hours");

  const supabase = createPublicClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("packages_with_items")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") {
      console.warn("[packages] Falta ejecutar supabase/migrations/0003_packages.sql: no se muestran paquetes.");
      return [];
    }
    // Se lanza para no cachear una lista vacía por un fallo temporal
    throw new Error(`[packages] No se pudieron cargar los paquetes: ${error.message}`);
  }

  // Un paquete sin contenido visible (p. ej. todos sus productos ocultos) no se muestra
  return data.map(rowToPackage).filter((p) => p.items.length > 0);
}
