import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { signOutCustomer } from "@/app/auth/actions";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { Logo } from "@/components/ui/Logo";

export const metadata: Metadata = {
  title: { default: "Dashboard · IQONIC WELLNESS", template: "%s · Dashboard IQONIC" },
  robots: { index: false, follow: false },
};

/**
 * /dashboard — Panel del distribuidor, separado de la tienda:
 * su propia barra lateral (escritorio) o superior (móvil), sin la navbar,
 * el carrito ni el footer de la tienda.
 *
 * El layout no lee la sesión (queda estático); cada página la valida con
 * getMyDistributorStats() y el proxy redirige antes si no hay sesión.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ink-950">
      {/* Escritorio: barra lateral fija */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/[.07] bg-ink-900/60 px-4 py-6 backdrop-blur-xl lg:flex">
        <div className="px-2">
          <Logo href="/dashboard" />
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-zinc-500">Panel distribuidor</p>
        </div>
        <div className="mt-8 flex-1">
          <DashboardNav variant="sidebar" />
        </div>
        <SecondaryLinks />
      </aside>

      {/* Móvil: barra superior con pestañas */}
      <header className="sticky top-0 z-30 border-b border-white/[.07] bg-ink-950/85 backdrop-blur-xl lg:hidden">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <Logo href="/dashboard" />
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/5"
            >
              Tienda
            </Link>
            <SignOutButton compact />
          </div>
        </div>
        <div className="px-4 pb-3 sm:px-6">
          <DashboardNav variant="tabs" />
        </div>
      </header>

      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10 lg:py-12">{children}</div>
      </main>
    </div>
  );
}

function SecondaryLinks() {
  const linkClass =
    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-white";
  return (
    <div className="space-y-1 border-t border-white/[.07] pt-4">
      <Link href="/" className={linkClass}>
        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 12H5M11 18l-6-6 6-6" />
        </svg>
        Volver a la tienda
      </Link>
      <Link href="/cuenta" className={linkClass}>
        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0116 0" />
        </svg>
        Mi cuenta
      </Link>
      <SignOutButton />
    </div>
  );
}

function SignOutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action={signOutCustomer}>
      <button
        type="submit"
        className={
          compact
            ? "rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
            : "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-white"
        }
      >
        {!compact && (
          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        )}
        Salir
      </button>
    </form>
  );
}
