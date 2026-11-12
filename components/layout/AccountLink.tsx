"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { isSupabaseConfigured } from "@/utils/supabase/env";
import { createClient } from "@/utils/supabase/client";

/**
 * "Ingresar" o "Hola, Nombre" según haya sesión.
 * Se resuelve en el navegador para que la tienda siga siendo estática
 * (si leyéramos la sesión en el servidor, la portada dejaría de estar cacheada).
 * Solo cambia lo que se muestra: la protección real está en /cuenta.
 */
export function AccountLink({ className = "", onNavigate }: { className?: string; onNavigate?: () => void }) {
  const [name, setName] = useState<string | null | undefined>(undefined); // undefined = cargando

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    const read = (meta: Record<string, unknown> | undefined, loggedIn: boolean) =>
      setName(loggedIn ? (typeof meta?.first_name === "string" && meta.first_name) || "Mi cuenta" : null);

    supabase.auth.getSession().then(({ data }) => read(data.session?.user.user_metadata, Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) =>
      read(session?.user.user_metadata, Boolean(session)),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  const loggedIn = typeof name === "string";

  return (
    <Link
      href={loggedIn ? "/cuenta" : "/ingresar"}
      onClick={onNavigate}
      className={`inline-flex items-center gap-2 text-sm font-semibold transition hover:text-white ${className}`}
    >
      <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0116 0" />
      </svg>
      <span className="max-w-[110px] truncate">{loggedIn ? (name === "Mi cuenta" ? name : `Hola, ${name}`) : "Ingresar"}</span>
    </Link>
  );
}
