"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Dominio real de la página abierta (window.location.origin): el enlace que
 * se comparte usa el mismo dominio por el que entró el distribuidor, sea el
 * propio, el de Railway o localhost.
 *
 * En el servidor (y durante la hidratación) devuelve `fallback`
 * (siteConfig.url); justo después React lo cambia por el dominio real, sin
 * errores de hidratación.
 */
export function useSiteOrigin(fallback: string): string {
  return useSyncExternalStore(
    subscribe,
    () => window.location.origin,
    () => fallback,
  );
}
