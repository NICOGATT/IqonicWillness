import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { categoryFilters, fallbackProducts } from "@/data/products";
import { rowToProduct } from "@/lib/product-mapper";
import type { CategoryFilter, Product } from "@/types/product";
import { createPublicClient } from "@/utils/supabase/public";

/**
 * Capa de acceso a datos del catálogo PÚBLICO.
 *
 * - Lee de Supabase con un cliente anónimo (RLS solo devuelve productos activos).
 * - "use cache" + cacheTag("products"): la página se sirve prerenderizada y,
 *   cuando el admin crea/edita/elimina, las Server Actions llaman a
 *   updateTag("products") y el siguiente visitante ya ve los cambios.
 * - cacheLife("hours") es una red de seguridad por si se edita la tabla
 *   directamente en el dashboard de Supabase.
 * - Sin variables de Supabase, usa el catálogo de respaldo (data/products.ts).
 */
export const PRODUCTS_CACHE_TAG = "products";

export async function getProducts(): Promise<Product[]> {
  "use cache";
  cacheTag(PRODUCTS_CACHE_TAG);
  cacheLife("hours");

  const supabase = createPublicClient();
  if (!supabase) {
    console.warn("[products] Supabase no está configurado: usando el catálogo de respaldo.");
    return fallbackProducts;
  }

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    // Se lanza para no cachear un catálogo vacío por un fallo temporal.
    throw new Error(`[products] No se pudieron cargar los productos: ${error.message}`);
  }
  return data.map(rowToProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const products = await getProducts();
  return products.find((product) => product.slug === slug);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const products = await getProducts();
  const featured = products.filter((product) => product.featured);
  // Si nadie está marcado como destacado, usa los 3 primeros
  return (featured.length ? featured : products).slice(0, 3);
}

export async function getCategoryFilters(): Promise<CategoryFilter[]> {
  const products = await getProducts();
  // Solo muestra filtros de categorías que tengan productos
  return categoryFilters.filter((f) => f.value === "all" || products.some((p) => p.category === f.value));
}
