"use client";

import Link from "next/link";

import { useSignedIn } from "@/lib/use-signed-in";
import { isSupabaseConfigured } from "@/utils/supabase/env";

/**
 * "Mi tienda" → /mi-panel, solo con sesión iniciada.
 * Se resuelve en el navegador (la tienda sigue siendo estática); la
 * protección real está en el proxy y en la página.
 */
export function DistributorPanelLink({
  className = "",
  compact = false,
  onNavigate,
}: {
  className?: string;
  /** Solo el ícono por debajo de lg (barra de escritorio estrecha). */
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const signedIn = useSignedIn();
  if (!isSupabaseConfigured() || signedIn !== true) return null;

  return (
    <Link
      href="/mi-panel"
      onClick={onNavigate}
      title="Mi tienda (panel distribuidor)"
      className={`inline-flex items-center gap-2 text-sm font-semibold transition hover:text-white ${className}`}
    >
      <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6" />
      </svg>
      <span className={compact ? "sr-only lg:not-sr-only" : ""}>Mi tienda</span>
    </Link>
  );
}
