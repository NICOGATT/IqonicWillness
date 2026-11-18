"use client";

import { useEffect, useState } from "react";

import { isValidSlugFormat } from "@/lib/validation/referral";
import { isSupabaseConfigured } from "@/utils/supabase/env";
import { createClient } from "@/utils/supabase/client";

/**
 * Distribuidor activo de la visita (cookie `iqonic_ref`), resuelto en el navegador.
 *
 * La cookie NO es httpOnly a propósito (ver lib/referral-attribution.ts): así
 * la tienda sigue siendo estática y la UI puede mostrar "Estás comprando en la
 * tienda de Juan". Solo es informativo: el checkout la vuelve a validar en el
 * servidor antes de registrar el pedido.
 */

/** Mismo nombre que REFERRAL_COOKIE en lib/referral-attribution.ts (ese módulo usa next/server). */
const REFERRAL_COOKIE = "iqonic_ref";
const SESSION_KEY = "iqonic-ref-info-v1";

export type ActiveReferral = { slug: string; nombre_mostrar: string };

/** Una sola consulta por slug y por carga de página, aunque varios componentes usen el hook. */
const requests = new Map<string, Promise<ActiveReferral | null>>();

function readReferralCookie(): string | null {
  const entry = document.cookie.split("; ").find((c) => c.startsWith(`${REFERRAL_COOKIE}=`));
  if (!entry) return null;
  try {
    const slug = decodeURIComponent(entry.slice(REFERRAL_COOKIE.length + 1)).trim().toLowerCase();
    return isValidSlugFormat(slug) ? slug : null;
  } catch {
    return null;
  }
}

function readSessionCache(slug: string): ActiveReferral | null {
  try {
    const cached = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) ?? "null") as ActiveReferral | null;
    return cached?.slug === slug && typeof cached.nombre_mostrar === "string" ? cached : null;
  } catch {
    return null;
  }
}

function writeSessionCache(value: ActiveReferral | null) {
  try {
    if (value) window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(value));
    else window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Almacenamiento bloqueado: solo perdemos la caché
  }
}

function loadReferral(slug: string): Promise<ActiveReferral | null> {
  const cached = readSessionCache(slug);
  if (cached) return Promise.resolve(cached);

  let request = requests.get(slug);
  if (!request) {
    request = (async () => {
      // RLS: anónimos y clientes solo ven distribuidores ACTIVOS y sus columnas públicas
      const { data, error } = await createClient()
        .from("distribuidores")
        .select("slug, nombre_mostrar")
        .eq("slug", slug)
        .eq("activo", true)
        .maybeSingle();
      if (error) {
        console.warn("[referidos] No se pudo leer el distribuidor activo:", error.message);
        requests.delete(slug); // reintenta en la próxima página
        return null;
      }
      writeSessionCache(data);
      return data;
    })();
    requests.set(slug, request);
  }
  return request;
}

/** null mientras carga, si no hay referido o si el distribuidor ya no está activo. */
export function useActiveReferral(): ActiveReferral | null {
  const [referral, setReferral] = useState<ActiveReferral | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const slug = readReferralCookie();
    if (!slug) return;

    let cancelled = false;
    loadReferral(slug).then((value) => {
      if (!cancelled) setReferral(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return referral;
}
