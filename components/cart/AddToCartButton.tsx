"use client";

import { useEffect, useState } from "react";

import { CartIcon } from "@/components/icons/CartIcon";
import type { CartItemInput } from "@/lib/cart";
import { addToCart } from "@/lib/cart-store";

interface AddToCartButtonProps {
  item: CartItemInput;
  size?: "md" | "lg";
  className?: string;
  ariaLabel?: string;
}

const sizeClasses = {
  md: "gap-2.5 rounded-2xl px-5 py-3.5 text-[15px]",
  lg: "gap-3 rounded-2xl px-7 py-4 text-base",
};

/**
 * Agrega el producto/paquete al carrito y muestra "Agregado" un instante.
 * Usa el color de acento del contenedor (.btn-accent).
 */
export function AddToCartButton({ item, size = "md", className = "", ariaLabel }: AddToCartButtonProps) {
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 1600);
    return () => clearTimeout(timer);
  }, [added]);

  return (
    <button
      type="button"
      onClick={() => {
        addToCart(item);
        setAdded(true);
      }}
      aria-label={ariaLabel}
      className={`btn-accent inline-flex items-center justify-center whitespace-nowrap font-bold ${sizeClasses[size]} ${className}`}
    >
      {added ? (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      ) : (
        <CartIcon className="h-5 w-5" />
      )}
      <span aria-live="polite">{added ? "¡Agregado!" : "Agregar al carrito"}</span>
    </button>
  );
}
