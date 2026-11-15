"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Enlace entre /ingresar y /registro que conserva ?next=
 * (así, si venía del checkout, vuelve a /pago al terminar).
 * Usa useSearchParams: debe ir dentro de <Suspense>.
 */
export function AuthSwitchLink({ href, children }: { href: string; children: ReactNode }) {
  const next = useSearchParams().get("next");
  const target = next ? `${href}?next=${encodeURIComponent(next)}` : href;
  return (
    <Link href={target} className="font-semibold text-white hover:underline">
      {children}
    </Link>
  );
}
