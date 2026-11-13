"use client";

import { useSyncExternalStore } from "react";

import { MAX_QUANTITY, type CartItem, type CartItemInput } from "@/lib/cart";

/**
 * Estado del carrito en el navegador (sin Provider):
 * - Se guarda en localStorage, así sobrevive a recargas y a cambiar de página.
 * - Se sincroniza entre pestañas con el evento "storage".
 * - useSyncExternalStore evita errores de hidratación: en el servidor (y en el
 *   primer render del cliente) el carrito está vacío.
 */

const STORAGE_KEY = "iqonic-cart-v1";
const EMPTY: CartItem[] = [];

let items: CartItem[] = EMPTY;
let loaded = false;
let open = false;
const listeners = new Set<() => void>();

function clampQuantity(value: number): number {
  return Math.min(MAX_QUANTITY, Math.max(1, Math.floor(value)));
}

/** Descarta lo que no tenga la forma esperada (datos viejos o editados a mano). */
function sanitize(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return EMPTY;
  const valid = raw.filter(
    (i): i is CartItem =>
      typeof i === "object" &&
      i !== null &&
      typeof i.key === "string" &&
      (i.kind === "product" || i.kind === "package") &&
      typeof i.id === "string" &&
      typeof i.name === "string" &&
      (typeof i.detail === "string" || i.detail === null) &&
      ((typeof i.price === "number" && Number.isFinite(i.price) && i.price >= 0) || i.price === null) &&
      typeof i.quantity === "number" &&
      Number.isFinite(i.quantity) &&
      typeof i.accent === "string" &&
      typeof i.href === "string",
  );
  return valid.length ? valid.map((i) => ({ ...i, quantity: clampQuantity(i.quantity) })) : EMPTY;
}

function readStorage(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  items = readStorage();
}

function emit() {
  listeners.forEach((listener) => listener());
}

function commit(next: CartItem[]) {
  items = next.length ? next : EMPTY;
  try {
    if (items.length) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Modo privado o almacenamiento bloqueado: el carrito funciona igual mientras dure la visita
  }
  emit();
}

function onStorage(event: StorageEvent) {
  if (event.key !== null && event.key !== STORAGE_KEY) return;
  items = readStorage();
  emit();
}

function subscribe(listener: () => void) {
  ensureLoaded();
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function getItems() {
  ensureLoaded();
  return items;
}

/* ---------------------------- Acciones ---------------------------- */

export function addToCart(input: CartItemInput, quantity = 1) {
  ensureLoaded();
  const existing = items.find((i) => i.key === input.key);
  if (existing) {
    // Actualiza nombre/precio por si cambiaron desde que se agregó
    commit(items.map((i) => (i.key === input.key ? { ...input, quantity: clampQuantity(i.quantity + quantity) } : i)));
  } else {
    commit([...items, { ...input, quantity: clampQuantity(quantity) }]);
  }
}

export function setQuantity(key: string, quantity: number) {
  ensureLoaded();
  if (quantity < 1) return removeFromCart(key);
  commit(items.map((i) => (i.key === key ? { ...i, quantity: clampQuantity(quantity) } : i)));
}

export function removeFromCart(key: string) {
  ensureLoaded();
  commit(items.filter((i) => i.key !== key));
}

export function clearCart() {
  commit(EMPTY);
}

export function setCartOpen(value: boolean) {
  if (open === value) return;
  open = value;
  emit();
}

/* ----------------------------- Hooks ------------------------------ */

export function useCartItems(): CartItem[] {
  return useSyncExternalStore(subscribe, getItems, () => EMPTY);
}

export function useCartOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => open,
    () => false,
  );
}
