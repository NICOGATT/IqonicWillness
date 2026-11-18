"use client";

import Link from "next/link";

import { useSignedIn } from "@/lib/use-signed-in";
import { isSupabaseConfigured } from "@/utils/supabase/env";

/**
 * Botón "Dashboard" → /dashboard (panel del distribuidor), solo con sesión.
 * Se resuelve en el navegador (la tienda sigue siendo estática); la
 * protección real está en el proxy y en cada página del dashboard.
 *
 * - "button": botón compacto para la barra de escritorio.
 * - "menu":   fila del menú móvil (estilo que pasa el padre en className).
 */
export function DistributorPanelLink({
  variant = "button",
  className = "",
  onNavigate,
}: {
  variant?: "button" | "menu";
  className?: string;
  onNavigate?: () => void;
}) {
  const signedIn = useSignedIn();
  if (!isSupabaseConfigured() || signedIn !== true) return null;

  const icon = (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 13h8V3H3zM13 21h8V11h-8zM13 3v6h8V3zM3 21h8v-6H3z" />
    </svg>
  );

  if (variant === "menu") {
    return (
      <Link href="/dashboard" onClick={onNavigate} className={`inline-flex items-center gap-2 font-semibold ${className}`}>
        {icon}
        Dashboard
      </Link>
    );
  }

  return (
    <Link
      href="/dashboard"
      onClick={onNavigate}
      title="Panel de distribuidor"
      className={`inline-flex items-center gap-2 rounded-xl border border-brand-violet/40 bg-gradient-to-r from-brand-orange/15 to-brand-violet/20 px-3.5 py-2 text-sm font-semibold text-white transition hover:border-brand-violet/70 hover:from-brand-orange/25 hover:to-brand-violet/30 ${className}`}
    >
      {icon}
      Dashboard
    </Link>
  );
}
