"use client";

import { useSyncExternalStore } from "react";

/**
 * Datos del comprador para "Finalizar pedido por WhatsApp" (nombre y teléfono).
 * Se recuerdan en el navegador del propio comprador para no volver a pedirlos
 * en la próxima compra. Mismo patrón que lib/cart-store.ts (sin errores de hidratación).
 */

export type Buyer = { nombre: string; telefono: string };

const STORAGE_KEY = "iqonic-buyer-v1";
const EMPTY: Buyer = { nombre: "", telefono: "" };

let buyer: Buyer = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    if (raw && typeof raw.nombre === "string" && typeof raw.telefono === "string") {
      buyer = { nombre: raw.nombre.slice(0, 120), telefono: raw.telefono.slice(0, 30) };
    }
  } catch {
    // Datos corruptos o almacenamiento bloqueado: se empieza vacío
  }
}

function subscribe(listener: () => void) {
  ensureLoaded();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getBuyer() {
  ensureLoaded();
  return buyer;
}

export function setBuyer(patch: Partial<Buyer>) {
  ensureLoaded();
  buyer = { ...buyer, ...patch };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(buyer));
  } catch {
    // Modo privado: funciona igual mientras dure la visita
  }
  listeners.forEach((listener) => listener());
}

export function useBuyer(): Buyer {
  return useSyncExternalStore(subscribe, getBuyer, () => EMPTY);
}
