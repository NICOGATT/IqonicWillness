/** Aviso en ingresar/registro cuando el cliente viene del checkout. */
export function CheckoutNotice() {
  return (
    <p role="status" className="flex gap-2.5 rounded-xl border border-brand-violet/30 bg-brand-violet/10 px-3.5 py-3 text-sm leading-relaxed text-zinc-200">
      <svg className="mt-0.5 h-4 w-4 shrink-0 text-brand-violet-light" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 4h2l2.4 11.2a2 2 0 002 1.6h7.7a2 2 0 002-1.5L21 8H6" />
        <circle cx="10" cy="20" r="1" />
        <circle cx="17" cy="20" r="1" />
      </svg>
      <span>Para finalizar tu compra necesitas tu cuenta. Tu carrito queda guardado y vuelves al pago al terminar.</span>
    </p>
  );
}
