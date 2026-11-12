"use client";

import { useEffect, useMemo, useState } from "react";

import { DeleteProductDialog } from "@/components/admin/DeleteProductDialog";
import { inputClass } from "@/components/ui/fields";
import { ProductFormDialog } from "@/components/admin/ProductFormDialog";
import { ProductArt } from "@/components/product/ProductArt";
import { formatPrice } from "@/lib/format";
import { PRODUCT_CATEGORIES, type Product } from "@/types/product";

type DialogState = { kind: "none" } | { kind: "create" } | { kind: "edit"; product: Product } | { kind: "delete"; product: Product };

const categoryLabel = (value: Product["category"]) => PRODUCT_CATEGORIES.find((c) => c.value === value)?.label ?? value;

/**
 * Gestión de productos: listado, búsqueda y apertura de los modales.
 * Recibe los datos ya cargados en el servidor; tras cada Server Action,
 * `refresh()` vuelve a renderizar la página y llegan las props actualizadas.
 */
export function ProductsManager({ products }: { products: Product[] }) {
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  // El aviso de éxito desaparece solo
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => `${p.name} ${p.flavor} ${p.type}`.toLowerCase().includes(q));
  }, [products, query]);

  const close = () => setDialog({ kind: "none" });
  const done = (message: string) => {
    setNotice(message);
    close();
  };

  const visibleCount = products.filter((p) => p.isActive).length;

  return (
    <>
      {/* Encabezado */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Productos</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {products.length} en total · {visibleCount} visibles en la tienda
          </p>
        </div>
        <div className="flex gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar…"
            aria-label="Buscar productos"
            className={`${inputClass} sm:w-56`}
          />
          <button
            type="button"
            onClick={() => setDialog({ kind: "create" })}
            className="shrink-0 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-ink-950 transition hover:bg-zinc-200"
          >
            + Nuevo producto
          </button>
        </div>
      </div>

      {notice && (
        <p role="status" className="mt-6 rounded-xl border border-wa/30 bg-wa/10 px-4 py-3 text-sm text-wa">
          {notice}
        </p>
      )}

      {/* Lista */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-white/[.07] bg-white/[.02]">
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-zinc-400">{products.length === 0 ? "Todavía no hay productos." : "Ningún producto coincide con la búsqueda."}</p>
            {products.length === 0 && (
              <button type="button" onClick={() => setDialog({ kind: "create" })} className="mt-4 text-sm font-semibold text-white underline underline-offset-4">
                Crear el primero
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="hidden border-b border-white/[.07] text-xs uppercase tracking-wider text-zinc-500 md:table-header-group">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Producto</th>
                <th scope="col" className="px-5 py-3 font-semibold">Categoría</th>
                <th scope="col" className="px-5 py-3 font-semibold">Presentación</th>
                <th scope="col" className="px-5 py-3 font-semibold">Precio</th>
                <th scope="col" className="px-5 py-3 font-semibold">Estado</th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[.06]">
              {filtered.map((product) => (
                <tr key={product.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 md:table-row md:p-0">
                  <td className="flex min-w-0 flex-1 items-center gap-3 md:px-5 md:py-3">
                    <span
                      className="relative h-14 w-12 shrink-0 rounded-xl"
                      style={{ background: `radial-gradient(circle, ${product.accent.from}33, transparent 70%)` }}
                    >
                      <ProductArt product={product} uid={`admin-${product.id}`} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-white">{product.name}</span>
                      <span className="block truncate text-xs" style={{ color: product.accent.from }}>
                        {product.flavor}
                      </span>
                    </span>
                  </td>
                  <td className="hidden text-zinc-400 md:table-cell md:px-5 md:py-3">{categoryLabel(product.category)}</td>
                  <td className="hidden text-zinc-400 md:table-cell md:px-5 md:py-3">{product.presentation.label}</td>
                  <td className="order-3 text-white md:order-none md:px-5 md:py-3">
                    {product.price !== null ? formatPrice(product.price) : <span className="text-zinc-600">—</span>}
                  </td>
                  <td className="order-4 md:order-none md:px-5 md:py-3">
                    <span className="flex flex-wrap gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          product.isActive ? "bg-wa/10 text-wa" : "bg-white/5 text-zinc-500"
                        }`}
                      >
                        {product.isActive ? "Visible" : "Oculto"}
                      </span>
                      {product.featured && (
                        <span className="rounded-full bg-brand-violet/15 px-2 py-0.5 text-[11px] font-semibold text-brand-violet-light">
                          Destacado
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="order-2 md:order-none md:px-5 md:py-3">
                    <span className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setDialog({ kind: "edit", product })}
                        className="rounded-lg px-3 py-1.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/5 hover:text-white"
                        aria-label={`Editar ${product.name} ${product.flavor}`}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setDialog({ kind: "delete", product })}
                        className="rounded-lg px-3 py-1.5 text-sm font-semibold text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
                        aria-label={`Eliminar ${product.name} ${product.flavor}`}
                      >
                        Eliminar
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {dialog.kind === "create" && <ProductFormDialog product={null} onClose={close} onSaved={done} />}
      {dialog.kind === "edit" && <ProductFormDialog product={dialog.product} onClose={close} onSaved={done} />}
      {dialog.kind === "delete" && <DeleteProductDialog product={dialog.product} onClose={close} onDeleted={done} />}
    </>
  );
}
