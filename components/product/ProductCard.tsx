import type { CSSProperties } from "react";

import { BenefitIcon } from "@/components/product/BenefitIcon";
import { ProductArt } from "@/components/product/ProductArt";
import { WhatsAppButton } from "@/components/whatsapp/WhatsAppButton";
import { getProductMessage } from "@/lib/whatsapp";
import type { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
  className?: string;
}

/**
 * Tarjeta de producto.
 * El color de acento se inyecta como variables CSS (--accent / --accent-2) y lo usan
 * las clases `.text-accent`, `.btn-accent`, etc. definidas en globals.css.
 */
export function ProductCard({ product, className = "" }: ProductCardProps) {
  const accentVars = {
    "--accent": product.accent.from,
    "--accent-2": product.accent.to,
  } as CSSProperties;

  return (
    <article
      style={accentVars}
      className={`product-card group relative flex flex-col overflow-hidden rounded-[1.75rem] ${className}`}
    >
      {/* Visual */}
      <div className="art-stage relative flex h-64 items-center justify-center overflow-hidden sm:h-72">
        <div className="card-glow absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 opacity-60 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
        <span className="border-accent-soft text-accent absolute left-4 top-4 rounded-full border bg-black/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur">
          {product.badge}
        </span>
        <div className="art relative h-56 w-48 sm:h-64 sm:w-56">
          <ProductArt product={product} uid={product.id} />
        </div>
      </div>

      {/* Contenido */}
      <div className="flex flex-1 flex-col p-6 pt-2 sm:p-7 sm:pt-3">
        <p className="text-accent text-xs font-semibold uppercase tracking-[0.18em]">{product.type}</p>
        <h3 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">{product.name}</h3>

        <span className="border-accent-soft bg-accent-soft mt-4 inline-flex w-fit items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium text-white">
          <span className="dot-accent h-2 w-2 rounded-full" />
          Sabor <span className="text-accent font-semibold">{product.flavor}</span>
        </span>

        <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-3.5">
          {product.benefits.map((benefit) => (
            <li key={benefit.label} className="flex items-center gap-2.5 text-[13px] leading-tight text-zinc-300">
              <span className="bg-accent-soft text-accent grid h-8 w-8 shrink-0 place-items-center rounded-lg">
                <BenefitIcon name={benefit.icon} />
              </span>
              {benefit.label}
            </li>
          ))}
        </ul>

        {/* Empuja la presentación y el botón al fondo para alinear tarjetas */}
        <div className="mt-auto pt-6" />
        <div className="flex items-center gap-3 rounded-2xl border border-white/[.06] bg-black/25 px-4 py-3">
          <svg className="h-5 w-5 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
            <path d="M3 8l9 5 9-5M12 13v8" />
          </svg>
          <div className="text-sm leading-tight">
            <p className="font-semibold text-white">{product.presentation.label}</p>
            <p className="text-xs text-zinc-500">{product.presentation.detail}</p>
          </div>
        </div>

        <WhatsAppButton
          variant="accent"
          fullWidth
          className="mt-6"
          message={getProductMessage(product)}
          ariaLabel={`Pedir ${product.name} sabor ${product.flavor} por WhatsApp`}
        />
      </div>
    </article>
  );
}
