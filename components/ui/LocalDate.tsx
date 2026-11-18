"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * Fecha en la zona horaria del navegador. En el servidor (UTC) se muestra solo
 * el día, y tras hidratar se completa con la hora local: sin errores de hidratación.
 */
export function LocalDate({ iso, className }: { iso: string; className?: string }) {
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const date = new Date(iso);
  const text = hydrated
    ? date.toLocaleString("es", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

  return (
    <time dateTime={iso} className={className}>
      {text}
    </time>
  );
}
