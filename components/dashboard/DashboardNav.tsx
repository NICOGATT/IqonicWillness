"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Secciones del panel del distribuidor. */
const sections: { href: string; label: string; icon: ReactNode }[] = [
  {
    href: "/dashboard",
    label: "Resumen",
    icon: <path d="M3 13h8V3H3zM13 21h8V11h-8zM13 3v6h8V3zM3 21h8v-6H3z" />,
  },
  {
    href: "/dashboard/pedidos",
    label: "Pedidos",
    icon: <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />,
  },
  {
    href: "/dashboard/tienda",
    label: "Mi tienda",
    icon: <path d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6" />,
  },
];

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Navegación del dashboard.
 * - "sidebar": lista vertical (escritorio).
 * - "tabs": pestañas horizontales con scroll (móvil).
 */
export function DashboardNav({ variant }: { variant: "sidebar" | "tabs" }) {
  const pathname = usePathname();
  const vertical = variant === "sidebar";

  return (
    <nav aria-label="Secciones del panel">
      <ul className={vertical ? "space-y-1" : "-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none]"}>
        {sections.map((s) => {
          const active = isActive(pathname, s.href);
          return (
            <li key={s.href} className={vertical ? "" : "shrink-0"}>
              <Link
                href={s.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl text-sm font-semibold transition ${
                  vertical ? "px-3 py-2.5" : "px-3.5 py-2"
                } ${
                  active
                    ? "bg-gradient-to-r from-brand-orange/15 to-brand-violet/15 text-white ring-1 ring-inset ring-white/10"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <svg
                  className={`h-[18px] w-[18px] shrink-0 ${active ? "text-brand-orange" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {s.icon}
                </svg>
                {s.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
