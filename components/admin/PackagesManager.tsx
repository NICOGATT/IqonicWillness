"use client";

import { useEffect, useMemo, useState } from "react";

import { DeletePackageDialog } from "@/components/admin/DeletePackageDialog";
import { PackageFormDialog } from "@/components/admin/PackageFormDialog";
import { inputClass } from "@/components/ui/fields";
import { formatPrice } from "@/lib/format";
import type { PackageWithItemsRow } from "@/types/database";
import type { Product } from "@/types/product";

type DialogState =
  | { kind: "none" }
  | { kind: "create" }
  | { kind: "edit"; pkg: PackageWithItemsRow }
  | { kind: "delete"; pkg: PackageWithItemsRow };

/** "1× IGNITE (Amazon Punch) + 2× DAILY SHOTS (Lemon Splash)" */
const contentsLabel = (pkg: PackageWithItemsRow) =>
  pkg.items.map((i) => `${i.quantity}× ${i.name} (${i.flavor})`).join(" + ");

/** Gestión de paquetes: listado, búsqueda y modales de crear/editar/eliminar. */
export function PackagesManager({ packages, products }: { packages: PackageWithItemsRow[]; products: Product[] }) {
  const [dialog, setDialog] = useState<DialogState>({ kind: "none" });
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter((p) => `${p.name} ${contentsLabel(p)}`.toLowerCase().includes(q));
  }, [packages, query]);

  const close = () => setDialog({ kind: "none" });
  const done = (message: string) => {
    setNotice(message);
    close();
  };

  const visibleCount = packages.filter((p) => p.is_active).length;
  const canCreate = products.length > 0;

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Paquetes</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {packages.length} en total · {visibleCount} visibles en la tienda
          </p>
        </div>
        <div className="flex gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar…"
            aria-label="Buscar paquetes"
            className={`${inputClass} sm:w-56`}
          />
          <button
            type="button"
            disabled={!canCreate}
            title={canCreate ? undefined : "Primero crea productos"}
            onClick={() => setDialog({ kind: "create" })}
            className="shrink-0 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-ink-950 transition hover:bg-zinc-200 disabled:opacity-50"
          >
            + Nuevo paquete
          </button>
        </div>
      </div>

      {notice && (
        <p role="status" className="mt-6 rounded-xl border border-wa/30 bg-wa/10 px-4 py-3 text-sm text-wa">
          {notice}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/[.07] bg-white/[.02]">
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-zinc-400">
              {packages.length === 0 ? "Todavía no hay paquetes." : "Ningún paquete coincide con la búsqueda."}
            </p>
            {packages.length === 0 && canCreate && (
              <button
                type="button"
                onClick={() => setDialog({ kind: "create" })}
                className="mt-4 text-sm font-semibold text-white underline underline-offset-4"
              >
                Crear el primero
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="hidden border-b border-white/[.07] text-xs uppercase tracking-wider text-zinc-500 md:table-header-group">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Paquete</th>
                <th scope="col" className="px-5 py-3 font-semibold">Contiene</th>
                <th scope="col" className="px-5 py-3 font-semibold">Precio</th>
                <th scope="col" className="px-5 py-3 font-semibold">Estado</th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[.06]">
              {filtered.map((pkg) => (
                <tr key={pkg.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4 md:table-row md:p-0">
                  <td className="min-w-0 flex-1 md:px-5 md:py-3">
                    <span className="block truncate font-semibold text-white">{pkg.name}</span>
                    {pkg.badge && <span className="block truncate text-xs text-brand-orange">{pkg.badge}</span>}
                  </td>
                  <td className="order-5 w-full text-zinc-400 md:order-none md:w-auto md:px-5 md:py-3">
                    {pkg.items.length > 0 ? (
                      <ul className="space-y-0.5">
                        {pkg.items.map((item) => (
                          <li key={item.product_id}>
                            <span className="text-zinc-200">{item.quantity}×</span> {item.name}{" "}
                            <span className="text-zinc-500">({item.flavor})</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-zinc-600">Sin productos</span>
                    )}
                  </td>
                  <td className="order-3 md:order-none md:px-5 md:py-3">
                    <span className="block text-white">{formatPrice(Number(pkg.price))}</span>
                    {pkg.regular_price !== null && Number(pkg.savings) > 0 && (
                      <span className="block text-xs text-zinc-500">
                        <s>{formatPrice(Number(pkg.regular_price))}</s>{" "}
                        <span className="text-wa">ahorra {formatPrice(Number(pkg.savings))}</span>
                      </span>
                    )}
                  </td>
                  <td className="order-4 md:order-none md:px-5 md:py-3">
                    <span className="flex flex-wrap gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          pkg.is_active ? "bg-wa/10 text-wa" : "bg-white/5 text-zinc-500"
                        }`}
                      >
                        {pkg.is_active ? "Visible" : "Oculto"}
                      </span>
                      {pkg.featured && (
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
                        onClick={() => setDialog({ kind: "edit", pkg })}
                        className="rounded-lg px-3 py-1.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/5 hover:text-white"
                        aria-label={`Editar ${pkg.name}`}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setDialog({ kind: "delete", pkg })}
                        className="rounded-lg px-3 py-1.5 text-sm font-semibold text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
                        aria-label={`Eliminar ${pkg.name}`}
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

      {dialog.kind === "create" && <PackageFormDialog pkg={null} products={products} onClose={close} onSaved={done} />}
      {dialog.kind === "edit" && <PackageFormDialog pkg={dialog.pkg} products={products} onClose={close} onSaved={done} />}
      {dialog.kind === "delete" && <DeletePackageDialog pkg={dialog.pkg} onClose={close} onDeleted={done} />}
    </>
  );
}
