import { cacheLife } from "next/cache";

import { categoryFilters, products } from "@/data/products";
import type { CategoryFilter, Product } from "@/types/product";

/**
 * Capa de acceso a datos.
 *
 * Hoy lee el mock de `data/products.ts`. Cuando exista el backend propio,
 * solo cambia el cuerpo de estas funciones, por ejemplo:
 *
 *   const res = await fetch(`${process.env.API_URL}/products`);
 *   return (await res.json()) as Product[];
 *
 *   // o con un ORM:
 *   return db.product.findMany({ orderBy: { name: "asc" } });
 *
 * Las firmas ya son async para que los componentes no tengan que cambiar.
 * `"use cache"` + `cacheLife` (Cache Components de Next 16) guardan el resultado
 * y lo incluyen en el HTML prerenderizado; con una API real se revalida cada hora.
 */

export async function getProducts(): Promise<Product[]> {
  "use cache";
  cacheLife("hours");
  return products;
}

export async function getProductById(id: string): Promise<Product | undefined> {
  "use cache";
  cacheLife("hours");
  return products.find((product) => product.id === id);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  "use cache";
  cacheLife("hours");
  return products.filter((product) => product.featured);
}

export async function getCategoryFilters(): Promise<CategoryFilter[]> {
  "use cache";
  cacheLife("hours");
  return categoryFilters;
}
