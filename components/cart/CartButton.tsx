"use client";

import { CartIcon } from "@/components/icons/CartIcon";
import { getItemCount } from "@/lib/cart";
import { setCartOpen, useCartItems } from "@/lib/cart-store";

/** Ícono del carrito con la cantidad de unidades; abre el panel. */
export function CartButton({ className = "" }: { className?: string }) {
  const count = getItemCount(useCartItems());

  return (
    <button
      type="button"
      onClick={() => setCartOpen(true)}
      aria-label={count > 0 ? `Abrir carrito (${count} ${count === 1 ? "unidad" : "unidades"})` : "Abrir carrito"}
      aria-haspopup="dialog"
      className={`relative grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:border-white/25 hover:bg-white/10 ${className}`}
    >
      <CartIcon className="h-5 w-5" />
      {count > 0 && (
        <span
          // key: relanza la animación cada vez que cambia la cantidad
          key={count}
          className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 animate-badge-pop place-items-center rounded-full bg-gradient-to-br from-brand-orange to-brand-violet px-1 text-[11px] font-bold leading-none text-white"
          aria-hidden="true"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
