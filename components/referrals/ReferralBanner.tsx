"use client";

import { useActiveReferral } from "@/lib/use-active-referral";

/**
 * Franja discreta bajo el menú: "Estás comprando en la tienda de Juan".
 * Solo aparece si la visita llegó por el enlace de un distribuidor activo.
 */
export function ReferralBanner() {
  const referral = useActiveReferral();
  if (!referral) return null;

  return (
    <div className="border-t border-white/[.06] bg-gradient-to-r from-brand-violet/[.12] via-ink-950/60 to-brand-orange/[.10]">
      <p className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-1.5 text-center text-xs text-zinc-300 sm:px-6 sm:text-[13px] lg:px-8">
        <svg className="h-4 w-4 shrink-0 text-brand-violet-light" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          {/* Sello de verificado */}
          <path d="M12 2l2.4 1.8 3-.2.9 2.9 2.5 1.7-1 2.8 1 2.8-2.5 1.7-.9 2.9-3-.2L12 22l-2.4-1.8-3 .2-.9-2.9-2.5-1.7 1-2.8-1-2.8 2.5-1.7.9-2.9 3 .2z" />
          <path d="M8.5 12.2l2.3 2.3 4.7-4.8" fill="none" stroke="#07070a" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="truncate">
          Estás comprando en la tienda de <strong className="font-semibold text-white">{referral.nombre_mostrar}</strong>
        </span>
        <span className="hidden text-zinc-500 sm:inline">· asesor/a oficial</span>
      </p>
    </div>
  );
}
