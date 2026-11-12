"use client";

import { startTransition, useActionState, useId, useState, type FormEvent } from "react";

import { savePackage, type ActionState } from "@/app/admin/actions";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { Modal } from "@/components/admin/Modal";
import { Field, inputClass, Spinner } from "@/components/ui/fields";
import { formatPrice } from "@/lib/format";
import { MAX_PACKAGE_ITEMS } from "@/lib/validation/package";
import type { PackageWithItemsRow } from "@/types/database";
import type { Product } from "@/types/product";

interface PackageFormDialogProps {
  /** null = crear un paquete nuevo. */
  pkg: PackageWithItemsRow | null;
  products: Product[];
  onClose: () => void;
  onSaved: (message: string) => void;
}

type ItemRow = { key: string; productId: string; quantity: number };

const initialState: ActionState = { status: "idle" };

export function PackageFormDialog({ pkg, products, onClose, onSaved }: PackageFormDialogProps) {
  const isEdit = pkg !== null;
  const uid = useId();

  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await savePackage(prev, formData);
    if (result.status === "success") onSaved(result.message ?? "Guardado.");
    return result;
  }, initialState);
  const errors = state.fieldErrors ?? {};

  const [image, setImage] = useState(pkg?.image_url ?? "");
  const [price, setPrice] = useState(pkg ? String(pkg.price) : "");
  const [items, setItems] = useState<ItemRow[]>(() =>
    pkg?.items.length
      ? pkg.items.map((i) => ({ key: i.product_id, productId: i.product_id, quantity: i.quantity }))
      : [{ key: "first", productId: "", quantity: 1 }],
  );

  const updateItem = (key: string, patch: Partial<ItemRow>) =>
    setItems((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  // Precio por separado y ahorro, calculados en vivo con los precios actuales
  const productById = new Map(products.map((p) => [p.id, p]));
  const chosen = items.filter((i) => i.productId);
  const missingPrice = chosen.some((i) => productById.get(i.productId)?.price == null);
  const regularPrice = chosen.reduce((sum, i) => sum + (productById.get(i.productId)?.price ?? 0) * i.quantity, 0);
  const packagePrice = Number(price.replace(",", "."));
  const savings = !missingPrice && chosen.length > 0 && Number.isFinite(packagePrice) ? regularPrice - packagePrice : null;

  // Se envía con onSubmit + startTransition para que React no vacíe el
  // formulario cuando el servidor devuelve errores de validación.
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  const id = (name: string) => `${uid}-${name}`;
  const a11y = (name: string) => ({
    id: id(name),
    name,
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `${id(name)}-error` : undefined,
  });

  return (
    <Modal
      title={isEdit ? `Editar ${pkg.name}` : "Nuevo paquete"}
      description="Elige los productos que trae, cuántos de cada uno y el precio del paquete."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} noValidate className="grid gap-8 p-6 lg:grid-cols-[1fr_280px]">
        {isEdit && <input type="hidden" name="id" value={pkg.id} />}

        <div className="space-y-8">
          {state.status === "error" && state.message && (
            <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {state.message}
            </p>
          )}

          {/* --- Nombre y precio --- */}
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-4 font-display text-sm font-bold text-white">Paquete</legend>
            <Field label="Nombre *" htmlFor={id("name")} error={errors.name}>
              <input {...a11y("name")} defaultValue={pkg?.name} className={inputClass} placeholder="Pack Energía Total" />
            </Field>
            <Field label="Precio del paquete *" htmlFor={id("price")} error={errors.price}>
              <input
                {...a11y("price")}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="decimal"
                className={inputClass}
                placeholder="59.90"
              />
            </Field>
            <Field label="Descripción" htmlFor={id("description")} error={errors.description} className="sm:col-span-2">
              <textarea
                {...a11y("description")}
                defaultValue={pkg?.description ?? ""}
                rows={2}
                className={`${inputClass} resize-y`}
                placeholder="Texto corto para la tienda (máx. 400 caracteres)."
              />
            </Field>
          </fieldset>

          {/* --- Contenido --- */}
          <fieldset>
            <legend className="mb-4 font-display text-sm font-bold text-white">
              Contiene{" "}
              <span className="font-sans text-xs font-normal text-zinc-500">
                ({chosen.length}/{MAX_PACKAGE_ITEMS} productos)
              </span>
            </legend>
            <ul className="space-y-2.5">
              {items.map((item, index) => {
                const product = productById.get(item.productId);
                return (
                  <li key={item.key} className="flex items-center gap-2">
                    <select
                      name="item_product"
                      aria-label={`Producto ${index + 1}`}
                      value={item.productId}
                      onChange={(e) => updateItem(item.key, { productId: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">Elige un producto…</option>
                      {products.map((p) => (
                        <option
                          key={p.id}
                          value={p.id}
                          // Un producto no puede repetirse: se usa la cantidad
                          disabled={p.id !== item.productId && items.some((r) => r.productId === p.id)}
                        >
                          {p.name} · {p.flavor}
                          {p.price !== null ? ` · ${formatPrice(p.price)}` : " · sin precio"}
                          {p.isActive ? "" : " (oculto)"}
                        </option>
                      ))}
                    </select>
                    <input
                      name="item_quantity"
                      type="number"
                      min={1}
                      max={20}
                      aria-label={`Cantidad del producto ${index + 1}`}
                      value={item.quantity}
                      onChange={(e) => updateItem(item.key, { quantity: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
                      className={`${inputClass} w-20 shrink-0`}
                    />
                    <span className="hidden w-20 shrink-0 text-right text-xs text-zinc-500 sm:block">
                      {product?.price != null ? formatPrice(product.price * item.quantity) : "—"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setItems((rows) => rows.filter((r) => r.key !== item.key))}
                      disabled={items.length === 1}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30 disabled:hover:bg-transparent"
                      aria-label={`Quitar producto ${index + 1}`}
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </li>
                );
              })}
            </ul>
            {errors.items && <p className="mt-2 text-xs text-red-400">{errors.items}</p>}
            {items.length < MAX_PACKAGE_ITEMS && items.length < products.length && (
              <button
                type="button"
                onClick={() => setItems((rows) => [...rows, { key: crypto.randomUUID(), productId: "", quantity: 1 }])}
                className="mt-3 rounded-xl border border-dashed border-white/15 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-white/30 hover:text-white"
              >
                + Añadir producto
              </button>
            )}
          </fieldset>

          {/* --- Presentación --- */}
          <fieldset className="grid gap-4 sm:grid-cols-3">
            <legend className="mb-4 font-display text-sm font-bold text-white">Presentación</legend>
            <Field label="Etiqueta" htmlFor={id("badge")} error={errors.badge} hint="Ej. “Ahorra 15%”">
              <input {...a11y("badge")} defaultValue={pkg?.badge ?? ""} className={inputClass} placeholder="Combo" />
            </Field>
            <Field label="Slug" htmlFor={id("slug")} error={errors.slug} hint="Vacío = automático">
              <input {...a11y("slug")} defaultValue={pkg?.slug ?? ""} className={inputClass} placeholder="pack-energia-total" />
            </Field>
            <Field label="Orden" htmlFor={id("sort_order")} error={errors.sort_order} hint="Menor = primero">
              <input {...a11y("sort_order")} type="number" min={0} defaultValue={pkg?.sort_order ?? 100} className={inputClass} />
            </Field>
            <Field label="Imagen" htmlFor={id("image_url")} error={errors.image_url} hint="Opcional" className="sm:col-span-3">
              <div className="space-y-2">
                <ImageUpload onUploaded={setImage} />
                <div className="flex gap-2">
                  <input
                    {...a11y("image_url")}
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                    type="url"
                    className={inputClass}
                    placeholder="…o pega una URL https://"
                  />
                  {image && (
                    <button
                      type="button"
                      onClick={() => setImage("")}
                      className="shrink-0 rounded-xl px-3 text-xs font-semibold text-zinc-400 transition hover:bg-red-500/10 hover:text-red-400"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </div>
            </Field>
          </fieldset>

          {/* --- Visibilidad --- */}
          <fieldset className="flex flex-wrap gap-x-8 gap-y-3">
            <legend className="mb-4 font-display text-sm font-bold text-white">Visibilidad</legend>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-zinc-300">
              <input type="checkbox" name="is_active" defaultChecked={pkg?.is_active ?? true} className="h-4 w-4 accent-wa" />
              Visible en la tienda
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-zinc-300">
              <input type="checkbox" name="featured" defaultChecked={pkg?.featured ?? false} className="h-4 w-4 accent-brand-violet" />
              Destacado
            </label>
          </fieldset>
        </div>

        {/* --- Resumen --- */}
        <aside className="lg:sticky lg:top-0 lg:self-start">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Resumen</p>
          <div className="overflow-hidden rounded-2xl border border-white/[.07] bg-white/[.02]">
            {/^https:\/\/\S+$/.test(image) && (
              // eslint-disable-next-line @next/next/no-img-element -- vista previa de una URL arbitraria
              <img src={image} alt="" className="h-40 w-full object-contain bg-black/20" />
            )}
            <div className="space-y-3 p-4 text-sm">
              {chosen.length === 0 ? (
                <p className="text-zinc-500">Todavía no elegiste productos.</p>
              ) : (
                <ul className="space-y-1">
                  {chosen.map((i) => {
                    const p = productById.get(i.productId);
                    return (
                      <li key={i.key} className="flex justify-between gap-3">
                        <span className="text-zinc-300">
                          {i.quantity}× {p?.name} <span className="text-zinc-500">({p?.flavor})</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <dl className="space-y-1 border-t border-white/[.07] pt-3">
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Por separado</dt>
                  <dd className="text-zinc-300">{chosen.length === 0 ? "—" : missingPrice ? "falta precio" : formatPrice(regularPrice)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Paquete</dt>
                  <dd className="font-semibold text-white">{price && Number.isFinite(packagePrice) ? formatPrice(packagePrice) : "—"}</dd>
                </div>
                {savings !== null && price && (
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">{savings >= 0 ? "Ahorro" : "Más caro por"}</dt>
                    <dd className={savings >= 0 ? "text-wa" : "text-red-400"}>{formatPrice(Math.abs(savings))}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          <div className="mt-6 flex gap-3 lg:flex-col">
            <button
              type="submit"
              disabled={pending}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-ink-950 transition hover:bg-zinc-200 disabled:opacity-60"
            >
              {pending && <Spinner />}
              {pending ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear paquete"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/5"
            >
              Cancelar
            </button>
          </div>
        </aside>
      </form>
    </Modal>
  );
}
