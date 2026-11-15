"use client";

import type { ReactNode } from "react";

import { getCartTotals, getItemCount, type CartItem } from "@/lib/cart";
import { setCartOpen } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";

/** Resumen del pedido (columna derecha de /pago). El botón de pago llega como children. */
export function OrderSummary({ items, children }: { items: CartItem[]; children: ReactNode }) {
  const { total, hasUnpriced } = getCartTotals(items);
  const count = getItemCount(items);

  return (
    <section
      aria-labelledby="summary-title"
      className="rounded-3xl border border-white/[.08] bg-ink-900/80 p-5 shadow-2xl backdrop-blur sm:p-6 lg:sticky lg:top-28"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="summary-title" className="font-display text-lg font-bold text-white">
          Tu pedido
        </h2>
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="text-sm font-semibold text-brand-violet-light underline-offset-4 transition hover:underline"
        >
          Editar
        </button>
      </div>
      <p className="text-sm text-zinc-500">
        {count} {count === 1 ? "unidad" : "unidades"}
      </p>

      <ul className="mt-4 max-h-72 divide-y divide-white/[.06] overflow-y-auto pr-1">
        {items.map((item) => (
          <li key={item.key} className="flex items-start gap-3 py-3">
            <span className="relative mt-0.5 shrink-0">
              <span
                className="block h-10 w-10 rounded-xl"
                style={{ background: `linear-gradient(135deg, ${item.accent}, ${item.accent}55)` }}
                aria-hidden="true"
              />
              <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-zinc-200 px-1 text-[11px] font-bold text-ink-950">
                {item.quantity}
              </span>
            </span>
            <span className="min-w-0 flex-1 text-sm">
              <span className="block truncate font-semibold text-white">
                {item.kind === "package" ? `Paquete ${item.name}` : item.name}
              </span>
              {item.detail && <span className="line-clamp-1 text-zinc-500">{item.detail}</span>}
            </span>
            <span className="shrink-0 text-right text-sm font-semibold text-white">
              {item.price === null ? <span className="font-normal text-zinc-400">A consultar</span> : formatPrice(item.price * item.quantity)}
            </span>
          </li>
        ))}
      </ul>

      <dl className="mt-3 space-y-2 border-t border-white/[.07] pt-4 text-sm">
        <Row label="Subtotal">{formatPrice(total)}</Row>
        <Row label="Envío">
          <span className="text-zinc-400">A coordinar</span>
        </Row>
        <div className="flex items-end justify-between gap-3 pt-2">
          <dt className="leading-tight text-zinc-300">
            {hasUnpriced ? "Total estimado" : "Total"}
            {hasUnpriced && <span className="block text-xs text-zinc-500">+ productos con precio a consultar</span>}
          </dt>
          <dd className="font-display text-2xl font-bold text-white">{formatPrice(total)}</dd>
        </div>
      </dl>

      <div className="mt-5">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-zinc-400">{label}</dt>
      <dd className="font-medium text-white">{children}</dd>
    </div>
  );
}
