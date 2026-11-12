import Link from "next/link";
import type { ReactNode } from "react";

import { SetupNotice } from "@/components/admin/SetupNotice";
import { Logo } from "@/components/ui/Logo";
import { isSupabaseConfigured } from "@/utils/supabase/env";

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** Marco común de las páginas de registro, login y recuperación. */
export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main className="relative isolate grid min-h-screen place-items-center overflow-hidden px-4 py-16">
      <div className="grid-bg absolute inset-0 -z-10" aria-hidden="true" />
      <div className="absolute left-1/2 top-1/4 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-violet/20 blur-[120px]" aria-hidden="true" />
      <div className="absolute bottom-0 left-1/4 -z-10 h-72 w-72 rounded-full bg-brand-orange/15 blur-[110px]" aria-hidden="true" />

      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo href="/" />
        </div>
        <div className="rounded-3xl border border-white/[.08] bg-ink-900/80 p-6 shadow-2xl backdrop-blur sm:p-8">
          <h1 className="font-display text-2xl font-bold text-white">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-zinc-400">{subtitle}</p>}
          <div className="mt-7">{isSupabaseConfigured() ? children : <SetupNotice />}</div>
        </div>
        {footer && <div className="mt-6 text-center text-sm text-zinc-500">{footer}</div>}
        <p className="mt-4 text-center text-sm text-zinc-600">
          <Link href="/" className="transition hover:text-zinc-300">← Volver a la tienda</Link>
        </p>
      </div>
    </main>
  );
}
