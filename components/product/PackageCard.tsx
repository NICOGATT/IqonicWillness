import type { CSSProperties } from "react";

import { CutoutImage } from "@/components/product/CutoutImage";
import { ProductArt } from "@/components/product/ProductArt";
import { WhatsAppButton } from "@/components/whatsapp/WhatsAppButton";
import { formatPrice } from "@/lib/format";
import { getPackageMessage } from "@/lib/whatsapp";
import type { ProductPackage } from "@/types/package";
import type { Product } from "@/types/product";

interface PackageCardProps {
  pkg: ProductPackage;
  /** Productos del catálogo, para dibujar los envases si el paquete no tiene foto. */
  productsById: Map<string, Product>;
  className?: string;
}

/** Tarjeta de paquete: qué contiene, precio, ahorro y botón de pedido. */
export function PackageCard({ pkg, productsById, className = "" }: PackageCardProps) {
  const accentVars = { "--accent": "#ff8a1f", "--accent-2": "#9d5cff" } as CSSProperties;
  // Hasta 3 envases superpuestos cuando no hay foto del paquete
  const arts = pkg.items.map((i) => productsById.get(i.productId)).filter((p): p is Product => Boolean(p)).slice(0, 3);
  const discountPct = pkg.savings && pkg.regularPrice ? Math.round((pkg.savings / pkg.regularPrice) * 100) : null;

  return (
    <article style={accentVars} className={`product-card group relative flex flex-col overflow-hidden rounded-[1.75rem] ${className}`}>
      {/* Visual */}
      <div className="art-stage relative flex h-60 items-center justify-center overflow-hidden sm:h-64">
        <div className="card-glow absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 opacity-60 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
        <span className="absolute left-4 top-4 z-10 flex gap-2">
          {pkg.badge && (
            <span className="border-accent-soft text-accent rounded-full border bg-black/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur">
              {pkg.badge}
            </span>
          )}
          {discountPct !== null && discountPct > 0 && (
            <span className="rounded-full bg-wa px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-ink-950">
              −{discountPct}%
            </span>
          )}
        </span>

        {pkg.imageUrl ? (
          <div className="art relative h-52 w-full max-w-xs sm:h-56">
            <CutoutImage src={pkg.imageUrl} alt={pkg.name} sizes="(min-width: 1024px) 320px, 90vw" />
          </div>
        ) : (
          <div className="art relative flex h-52 items-end justify-center sm:h-56">
            {arts.map((product, i) => (
              <div
                key={product.id}
                className="relative h-44 w-32 sm:h-48 sm:w-36"
                style={{
                  marginLeft: i === 0 ? 0 : -40,
                  zIndex: arts.length - Math.abs(i - Math.floor(arts.length / 2)),
                  transform: arts.length > 1 ? `rotate(${(i - (arts.length - 1) / 2) * 8}deg)` : undefined,
                }}
              >
                <ProductArt product={product} uid={`pkg-${pkg.id}-${product.id}`} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="flex flex-1 flex-col p-6 pt-2 sm:p-7 sm:pt-3">
        <p className="text-accent text-xs font-semibold uppercase tracking-[0.18em]">
          Paquete · {pkg.itemCount} {pkg.itemCount === 1 ? "unidad" : "unidades"}
        </p>
        <h3 className="mt-2 font-display text-2xl font-bold tracking-tight text-white">{pkg.name}</h3>
        {pkg.description && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-400">{pkg.description}</p>}

        <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-zinc-500">Incluye</p>
        <ul className="mt-2 space-y-2">
          {pkg.items.map((item) => {
            const product = productsById.get(item.productId);
            return (
              <li key={item.productId} className="flex items-center gap-3 text-sm text-zinc-300">
                <span
                  className="grid h-7 min-w-7 place-items-center rounded-lg px-1.5 text-xs font-bold text-white"
                  style={{ background: product ? `${product.accent.from}33` : "rgba(255,255,255,.06)" }}
                >
                  {item.quantity}×
                </span>
                <span>
                  <span className="font-semibold text-white">{item.name}</span>{" "}
                  <span style={product ? { color: product.accent.from } : undefined}>{item.flavor}</span>
                </span>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto pt-6" />
        <div className="flex items-end justify-between gap-3 rounded-2xl border border-white/[.06] bg-black/25 px-4 py-3">
          <div className="text-sm leading-tight">
            {pkg.regularPrice !== null && pkg.savings !== null ? (
              <>
                <p className="text-xs text-zinc-500">
                  Por separado <s>{formatPrice(pkg.regularPrice)}</s>
                </p>
                <p className="mt-0.5 font-semibold text-wa">Ahorras {formatPrice(pkg.savings)}</p>
              </>
            ) : (
              <p className="text-zinc-400">Precio del paquete</p>
            )}
          </div>
          <p className="font-display text-2xl font-bold text-white">{formatPrice(pkg.price)}</p>
        </div>

        <WhatsAppButton
          variant="accent"
          fullWidth
          className="mt-6"
          message={getPackageMessage(pkg)}
          ariaLabel={`Pedir el paquete ${pkg.name} por WhatsApp`}
        >
          Pedir paquete por WhatsApp
        </WhatsAppButton>
      </div>
    </article>
  );
}
