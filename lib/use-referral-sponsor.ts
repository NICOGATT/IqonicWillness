"use client";

import { useEffect, useState } from "react";

import { IQONIC_ID_REGEX, normalizeIqonicId } from "@/lib/validation/customer";
import { isValidSlugFormat } from "@/lib/validation/referral";
import { isSupabaseConfigured } from "@/utils/supabase/env";
import { createClient } from "@/utils/supabase/client";

/**
 * Patrocinador de la visita: el distribuidor que la invitó con su enlace.
 * Se resuelve en el navegador para que la tienda y /registro sigan siendo estáticas.
 *
 * De dónde sale (en orden):
 *   1. cookie iqonic_sponsor → su iqonic_id (la dejan ?ref=, /r/<ref> y /<ref>);
 *   2. cookie iqonic_ref     → slug de su tienda (enlaces viejos);
 *   3. localStorage          → copia de respaldo por si se borraron las cookies;
 *      si la usa, vuelve a crear la cookie para que el servidor la vea al registrar.
 *
 * Los datos (nombre, iqonic_id, WhatsApp) vienen de la RPC distribuidor_publico(),
 * que nunca expone nada privado. Es solo informativo: el registro vuelve a
 * validar el patrocinador en el servidor y en el trigger de la BD.
 */

/** Mismos nombres que en lib/referral-attribution.ts (ese módulo usa next/server). */
const SPONSOR_COOKIE = "iqonic_sponsor";
const STORE_COOKIE = "iqonic_ref";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const LOCAL_KEY = "iqonic-sponsor-v1";
const SESSION_KEY = "iqonic-sponsor-info-v1";

export type ReferralSponsor = {
  /** "Juan Pérez" (o el nombre de su tienda si el perfil no lo tiene). */
  name: string;
  /** null si el distribuidor no cargó su WhatsApp. */
  whatsapp: string | null;
  /** null solo para tiendas viejas cuyo dueño todavía no es distribuidor. */
  iqonicId: string | null;
};

type Stored = ReferralSponsor & { ref: string; savedAt: number };

function readCookie(name: string): string | null {
  const entry = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  if (!entry) return null;
  try {
    return decodeURIComponent(entry.slice(name.length + 1)).trim() || null;
  } catch {
    return null;
  }
}

function readStorage(storage: Storage, key: string): Stored | null {
  try {
    const value = JSON.parse(storage.getItem(key) ?? "null") as Stored | null;
    return value && typeof value.ref === "string" && typeof value.name === "string" ? value : null;
  } catch {
    return null;
  }
}

function writeStorage(storage: Storage, key: string, value: Stored | null) {
  try {
    if (value) storage.setItem(key, JSON.stringify(value));
    else storage.removeItem(key);
  } catch {
    // Almacenamiento bloqueado (modo privado, iframes): solo perdemos la copia
  }
}

/** Referido vigente: cookie → respaldo en localStorage (máx. 30 días). */
function findRef(): string | null {
  const sponsor = readCookie(SPONSOR_COOKIE);
  if (sponsor && IQONIC_ID_REGEX.test(normalizeIqonicId(sponsor))) return normalizeIqonicId(sponsor);

  const store = readCookie(STORE_COOKIE)?.toLowerCase();
  if (store && isValidSlugFormat(store)) return store;

  const backup = readStorage(window.localStorage, LOCAL_KEY);
  if (!backup?.iqonicId) return null;
  const ageSeconds = (Date.now() - backup.savedAt) / 1000;
  if (ageSeconds > MAX_AGE_SECONDS) {
    writeStorage(window.localStorage, LOCAL_KEY, null);
    return null;
  }
  // Restaura la cookie por el tiempo que le quedaba
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${SPONSOR_COOKIE}=${encodeURIComponent(backup.iqonicId)}; Path=/; Max-Age=${Math.floor(
    MAX_AGE_SECONDS - ageSeconds,
  )}; SameSite=Lax${secure}`;
  return backup.iqonicId;
}

/** Una sola consulta por ref y por carga de página, aunque varios componentes usen el hook. */
const requests = new Map<string, Promise<ReferralSponsor | null>>();

async function fetchSponsor(ref: string): Promise<ReferralSponsor | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("distribuidor_publico", { p_ref: ref }).maybeSingle();
  if (error) throw error;
  if (data) {
    return { name: data.full_name?.trim() || "tu distribuidor/a", whatsapp: data.whatsapp, iqonicId: data.iqonic_id };
  }
  // Tienda vieja cuyo dueño todavía no tiene rol de distribuidor: no es
  // patrocinador válido, pero sí podemos mostrar su nombre y su WhatsApp.
  if (!isValidSlugFormat(ref)) return null;
  const { data: store, error: storeError } = await supabase
    .from("distribuidores")
    .select("nombre_mostrar, whatsapp")
    .eq("slug", ref)
    .eq("activo", true)
    .maybeSingle();
  if (storeError) throw storeError;
  return store ? { name: store.nombre_mostrar, whatsapp: store.whatsapp, iqonicId: null } : null;
}

function loadSponsor(ref: string): Promise<ReferralSponsor | null> {
  const cached = readStorage(window.sessionStorage, SESSION_KEY);
  if (cached?.ref === ref) return Promise.resolve(cached);

  let request = requests.get(ref);
  if (!request) {
    request = fetchSponsor(ref)
      .then((sponsor) => {
        const stored = sponsor ? { ...sponsor, ref, savedAt: Date.now() } : null;
        writeStorage(window.sessionStorage, SESSION_KEY, stored);
        // Respaldo de largo plazo solo con iqonic_id (es lo que necesita el registro)
        if (stored?.iqonicId) writeStorage(window.localStorage, LOCAL_KEY, { ...stored, ref: stored.iqonicId });
        return sponsor;
      })
      .catch((error: { message?: string }) => {
        console.warn("[referidos] No se pudo leer el patrocinador:", error?.message);
        requests.delete(ref); // reintenta en la próxima página
        return null;
      });
    requests.set(ref, request);
  }
  return request;
}

export type SponsorState = { status: "loading" } | { status: "none" } | { status: "ready"; sponsor: ReferralSponsor };

/** Estado del patrocinador: "loading" mientras se resuelve, "none" si entró sin enlace (o el enlace ya no vale). */
export function useReferralSponsor(): SponsorState {
  const [state, setState] = useState<SponsorState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const ref = isSupabaseConfigured() ? findRef() : null;
    const done = (sponsor: ReferralSponsor | null) => {
      if (!cancelled) setState(sponsor ? { status: "ready", sponsor } : { status: "none" });
    };
    if (ref) loadSponsor(ref).then(done);
    else queueMicrotask(() => done(null));
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
