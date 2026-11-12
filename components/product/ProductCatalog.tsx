"use client";

import { useState } from "react";

import { ProductCard } from "@/components/product/ProductCard";
import type { CategoryFilter, Product } from "@/types/product";

interface ProductCatalogProps {
  products: Product[];
  filters: CategoryFilter[];
}

/**
 * Grid de productos con filtros por categoría.
 * Recibe los datos ya resueltos desde el servidor (page.tsx), así que no
 * depende de dónde vengan (mock, API o base de datos).
 */
export function ProductCatalog({ products, filters }: ProductCatalogProps) {
  const [active, setActive] = useState<CategoryFilter["value"]>("all");
  const visible = active === "all" ? products : products.filter((p) => p.category === active);

  return (
    <>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-2" role="toolbar" aria-label="Filtrar productos">
        {filters.map((filter) => {
          const isActive = filter.value === active;
          return (
            <button
              key={filter.value}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActive(filter.value)}
              className={`rounded-full border px-5 py-2 text-sm font-semibold transition-all ${
                isActive
                  ? "border-white bg-white text-ink-950"
                  : "border-white/12 text-zinc-300 hover:border-white/30"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* 1 col móvil · 2 tablet · 3 desktop; flex-wrap centra la última fila */}
      <div className="mt-12 flex flex-wrap justify-center gap-6 lg:gap-8">
        {visible.map((product) => (
          <ProductCard
            // La key cambia con el filtro para relanzar la animación de entrada
            key={`${active}-${product.id}`}
            product={product}
            className="w-full animate-card-in md:w-[calc(50%-12px)] lg:w-[calc(33.333%-22px)]"
          />
        ))}
        {visible.length === 0 && <p className="text-zinc-500">No hay productos en esta categoría.</p>}
      </div>
    </>
  );
}
