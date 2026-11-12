"use client";

import { startTransition, useActionState, useId, useState, type FormEvent } from "react";

import { saveProduct, type ActionState } from "@/app/admin/actions";
import { Field, inputClass, Spinner } from "@/components/ui/fields";
import { Modal } from "@/components/admin/Modal";
import { BenefitIcon } from "@/components/product/BenefitIcon";
import { ProductArt } from "@/components/product/ProductArt";
import { defaultPackaging } from "@/lib/product-mapper";
import {
  BENEFIT_ICONS,
  PRODUCT_CATEGORIES,
  type BenefitIconName,
  type Product,
  type ProductCategory,
} from "@/types/product";

interface ProductFormDialogProps {
  /** null = crear un producto nuevo. */
  product: Product | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

type BenefitRow = { key: string; icon: BenefitIconName; label: string };

const initialState: ActionState = { status: "idle" };
const MAX_BENEFITS = 6;

export function ProductFormDialog({ product, onClose, onSaved }: ProductFormDialogProps) {
  const isEdit = product !== null;
  const uid = useId();

  // Envuelve la Server Action para cerrar el modal al guardar con éxito
  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await saveProduct(prev, formData);
    if (result.status === "success") onSaved(result.message ?? "Guardado.");
    return result;
  }, initialState);
  const errors = state.fieldErrors ?? {};

  // Campos controlados que alimentan la vista previa en vivo
  const [preview, setPreview] = useState({
    name: product?.name ?? "",
    flavor: product?.flavor ?? "",
    category: (product?.category ?? "gummies") as ProductCategory,
    presentationLabel: product?.presentation.label ?? "",
    accentFrom: product?.accent.from ?? "#FFA51F",
    accentTo: product?.accent.to ?? "#FF7A1A",
    image: product?.image ?? "",
  });
  const set = (key: keyof typeof preview) => (e: { target: { value: string } }) =>
    setPreview((p) => ({ ...p, [key]: e.target.value }));

  const [benefits, setBenefits] = useState<BenefitRow[]>(() =>
    (product?.benefits.length ? product.benefits : [{ icon: "bolt" as BenefitIconName, label: "" }]).map((b, i) => ({
      key: `${i}-${b.label}`,
      ...b,
    })),
  );

  // Se envía con onSubmit + startTransition (en vez de <form action>) para que
  // React no vacíe el formulario cuando el servidor devuelve errores de validación.
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  const previewProduct: Product = {
    id: product?.id ?? "preview",
    slug: "preview",
    name: preview.name || "NUEVO PRODUCTO",
    description: null,
    type: "",
    badge: null,
    flavor: preview.flavor,
    category: preview.category,
    presentation: { label: preview.presentationLabel, detail: null },
    benefits: [],
    price: null,
    accent: { from: preview.accentFrom, to: preview.accentTo },
    image: /^(https?:\/\/|\/)\S+$/.test(preview.image) ? preview.image : null,
    // Al editar un producto con ilustración personalizada (seed) se respeta la original
    packaging:
      product && product.name === preview.name && product.category === preview.category
        ? product.packaging
        : defaultPackaging({
            name: preview.name || "NUEVO PRODUCTO",
            category: preview.category,
            flavor: preview.flavor,
            presentation_label: preview.presentationLabel,
          }),
    featured: false,
    isActive: true,
    sortOrder: 0,
  };

  const id = (name: string) => `${uid}-${name}`;
  const a11y = (name: string) => ({
    id: id(name),
    name,
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `${id(name)}-error` : undefined,
  });

  return (
    <Modal
      title={isEdit ? `Editar ${product.name}` : "Nuevo producto"}
      description={isEdit ? `Sabor ${product.flavor}` : "Se publicará en la tienda al guardarlo si está marcado como visible."}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} noValidate className="grid gap-8 p-6 lg:grid-cols-[1fr_280px]">
        {isEdit && <input type="hidden" name="id" value={product.id} />}

        <div className="space-y-8">
          {state.status === "error" && state.message && (
            <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {state.message}
            </p>
          )}

          {/* --- Información básica --- */}
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-4 font-display text-sm font-bold text-white">Información</legend>
            <Field label="Nombre *" htmlFor={id("name")} error={errors.name}>
              <input {...a11y("name")} value={preview.name} onChange={set("name")} className={inputClass} placeholder="IQ PROTECT GUMMIES" />
            </Field>
            <Field label="Sabor *" htmlFor={id("flavor")} error={errors.flavor}>
              <input {...a11y("flavor")} value={preview.flavor} onChange={set("flavor")} className={inputClass} placeholder="Mango" />
            </Field>
            <Field label="Tipo / línea *" htmlFor={id("type")} error={errors.type}>
              <input {...a11y("type")} defaultValue={product?.type} className={inputClass} placeholder="Wellness Support Gummies" />
            </Field>
            <Field label="Categoría *" htmlFor={id("category")} error={errors.category}>
              <select {...a11y("category")} value={preview.category} onChange={set("category")} className={inputClass}>
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Descripción" htmlFor={id("description")} error={errors.description} className="sm:col-span-2">
              <textarea
                {...a11y("description")}
                defaultValue={product?.description ?? ""}
                rows={3}
                className={`${inputClass} resize-y`}
                placeholder="Texto corto que aparece en la tarjeta (máx. 400 caracteres)."
              />
            </Field>
          </fieldset>

          {/* --- Presentación y precio --- */}
          <fieldset className="grid gap-4 sm:grid-cols-3">
            <legend className="mb-4 font-display text-sm font-bold text-white">Presentación y precio</legend>
            <Field label="Presentación *" htmlFor={id("presentation_label")} error={errors.presentation_label}>
              <input
                {...a11y("presentation_label")}
                value={preview.presentationLabel}
                onChange={set("presentationLabel")}
                className={inputClass}
                placeholder="60 Gummies"
              />
            </Field>
            <Field label="Detalle" htmlFor={id("presentation_detail")} error={errors.presentation_detail}>
              <input {...a11y("presentation_detail")} defaultValue={product?.presentation.detail ?? ""} className={inputClass} placeholder="Net Wt. 7.4 oz (210 g)" />
            </Field>
            <Field label="Precio" htmlFor={id("price")} error={errors.price} hint="Vacío = no se muestra">
              <input
                {...a11y("price")}
                defaultValue={product?.price ?? ""}
                inputMode="decimal"
                className={inputClass}
                placeholder="29.90"
              />
            </Field>
            <Field label="Etiqueta" htmlFor={id("badge")} error={errors.badge} hint="Sobre la imagen">
              <input {...a11y("badge")} defaultValue={product?.badge ?? ""} className={inputClass} placeholder="Daily Gummies" />
            </Field>
            <Field label="Slug" htmlFor={id("slug")} error={errors.slug} hint="Vacío = automático">
              <input {...a11y("slug")} defaultValue={product?.slug ?? ""} className={inputClass} placeholder="iq-protect-mango" />
            </Field>
            <Field label="Orden" htmlFor={id("sort_order")} error={errors.sort_order} hint="Menor = primero">
              <input {...a11y("sort_order")} type="number" min={0} defaultValue={product?.sortOrder ?? 100} className={inputClass} />
            </Field>
          </fieldset>

          {/* --- Beneficios --- */}
          <fieldset>
            <legend className="mb-4 font-display text-sm font-bold text-white">
              Beneficios <span className="font-sans text-xs font-normal text-zinc-500">({benefits.length}/{MAX_BENEFITS})</span>
            </legend>
            <ul className="space-y-2.5">
              {benefits.map((benefit, index) => (
                <li key={benefit.key} className="flex items-center gap-2">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 text-zinc-300">
                    <BenefitIcon name={benefit.icon} />
                  </span>
                  <select
                    name="benefit_icon"
                    aria-label={`Icono del beneficio ${index + 1}`}
                    value={benefit.icon}
                    onChange={(e) =>
                      setBenefits((rows) => rows.map((r) => (r.key === benefit.key ? { ...r, icon: e.target.value as BenefitIconName } : r)))
                    }
                    className={`${inputClass} w-32 shrink-0`}
                  >
                    {BENEFIT_ICONS.map((icon) => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>
                  <input
                    name="benefit_label"
                    aria-label={`Texto del beneficio ${index + 1}`}
                    value={benefit.label}
                    onChange={(e) =>
                      setBenefits((rows) => rows.map((r) => (r.key === benefit.key ? { ...r, label: e.target.value } : r)))
                    }
                    maxLength={40}
                    className={inputClass}
                    placeholder="Apoyo inmune"
                  />
                  <button
                    type="button"
                    onClick={() => setBenefits((rows) => rows.filter((r) => r.key !== benefit.key))}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
                    aria-label={`Quitar beneficio ${index + 1}`}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
            {errors.benefits && <p className="mt-2 text-xs text-red-400">{errors.benefits}</p>}
            {benefits.length < MAX_BENEFITS && (
              <button
                type="button"
                onClick={() => setBenefits((rows) => [...rows, { key: crypto.randomUUID(), icon: "gem", label: "" }])}
                className="mt-3 rounded-xl border border-dashed border-white/15 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-white/30 hover:text-white"
              >
                + Añadir beneficio
              </button>
            )}
          </fieldset>

          {/* --- Imagen y colores --- */}
          <fieldset className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
            <legend className="mb-4 font-display text-sm font-bold text-white">Imagen y colores</legend>
            <Field label="URL de imagen" htmlFor={id("image_url")} error={errors.image_url} hint="Vacío = ilustración automática">
              <input
                {...a11y("image_url")}
                value={preview.image}
                onChange={set("image")}
                type="url"
                className={inputClass}
                placeholder="https://…/producto.png"
              />
            </Field>
            <Field label="Acento" htmlFor={id("accent_from")} error={errors.accent_from}>
              <input {...a11y("accent_from")} type="color" value={preview.accentFrom} onChange={set("accentFrom")} className="h-[42px] w-20 cursor-pointer rounded-xl border border-white/10 bg-ink-950/60 p-1" />
            </Field>
            <Field label="Degradado" htmlFor={id("accent_to")} error={errors.accent_to}>
              <input {...a11y("accent_to")} type="color" value={preview.accentTo} onChange={set("accentTo")} className="h-[42px] w-20 cursor-pointer rounded-xl border border-white/10 bg-ink-950/60 p-1" />
            </Field>
          </fieldset>

          {/* --- Visibilidad --- */}
          <fieldset className="flex flex-wrap gap-x-8 gap-y-3">
            <legend className="mb-4 font-display text-sm font-bold text-white">Visibilidad</legend>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-zinc-300">
              <input type="checkbox" name="is_active" defaultChecked={product?.isActive ?? true} className="h-4 w-4 accent-wa" />
              Visible en la tienda
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-zinc-300">
              <input type="checkbox" name="featured" defaultChecked={product?.featured ?? false} className="h-4 w-4 accent-brand-violet" />
              Destacado en la portada
            </label>
          </fieldset>
        </div>

        {/* --- Vista previa --- */}
        <aside className="lg:sticky lg:top-0 lg:self-start">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">Vista previa</p>
          <div
            className="relative grid h-72 place-items-center overflow-hidden rounded-2xl border border-white/[.07]"
            style={{ background: `radial-gradient(circle at 50% 60%, ${preview.accentFrom}44, transparent 65%)` }}
          >
            <div className="relative h-60 w-52">
              <ProductArt product={previewProduct} uid={`${uid}-preview`} />
            </div>
          </div>
          <p className="mt-3 font-display text-lg font-bold text-white">{previewProduct.name}</p>
          {preview.flavor && <p className="text-sm" style={{ color: preview.accentFrom }}>Sabor {preview.flavor}</p>}

          <div className="mt-6 flex gap-3 lg:flex-col">
            <button
              type="submit"
              disabled={pending}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-ink-950 transition hover:bg-zinc-200 disabled:opacity-60"
            >
              {pending && <Spinner />}
              {pending ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear producto"}
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
