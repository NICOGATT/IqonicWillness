"use client";

import { useEffect, useState } from "react";

import { isSupabaseConfigured } from "@/utils/supabase/env";
import { createClient } from "@/utils/supabase/client";

/**
 * ¿Hay un cliente con sesión? Se resuelve en el navegador (la tienda sigue
 * siendo estática). null = todavía no se sabe. Solo decide qué se muestra:
 * la protección real de /pago está en el servidor.
 */
export function useSignedIn(): boolean | null {
  const configured = isSupabaseConfigured();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    if (!configured) return;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
    return () => sub.subscription.unsubscribe();
  }, [configured]);

  // Sin Supabase no hay login: no bloqueamos el checkout en desarrollo
  return configured ? signedIn : true;
}
