import type { SVGProps } from "react";

/** Bolsa de compras (trazo con currentColor). */
export function CartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M6 7h12l1 13H5L6 7z" />
      <path d="M9 10V6a3 3 0 016 0v4" />
    </svg>
  );
}
