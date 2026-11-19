"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { isSupabaseConfigured } from "@/utils/supabase/env";
import { createClient } from "@/utils/supabase/client";

/** Una sola consulta por usuario y carga de página (la navbar móvil y la de escritorio usan el mismo enlace). */
const checks = new Map<string, Promise<boolean>>();

/**
 * ¿Puede entrar al panel? role = 'distributor' o 'admin', o tiene una tienda
 * creada antes de los roles (mismo criterio que getDistributorContext()).
 * RLS: cada usuario solo lee SU fila de customers y de distribuidores.
 */
function canUsePanel(userId: string): Promise<boolean> {
  let check = checks.get(userId);
  if (!check) {
    const supabase = createClient();
    check = (async () => {
      const { data: me } = await supabase.from("customers").select("role").eq("id", userId).maybeSingle();
      if (me?.role === "distributor" || me?.role === "admin") return true;
      const { data: store } = await supabase.from("distribuidores").select("id").eq("user_id", userId).maybeSingle();
      return store !== null;
    })().catch(() => false);
    checks.set(userId, check);
  }
  return check;
}

/** null = todavía no se sabe (no se muestra nada). */
function useCanUsePanel(): boolean | null {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    const supabase = createClient();
    const resolve = (userId: string | undefined) => {
      if (!userId) return setAllowed(false);
      canUsePanel(userId).then((value) => !cancelled && setAllowed(value));
    };

    supabase.auth.getSession().then(({ data }) => resolve(data.session?.user.id));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => resolve(session?.user.id));
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return allowed;
}

/**
 * Botón "Dashboard" → /dashboard (panel del distribuidor), solo para distribuidores.
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
  const allowed = useCanUsePanel();
  if (allowed !== true) return null;

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
