import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/ui/Logo";

interface StatusPageProps {
  tone: "success" | "neutral";
  title: string;
  children: ReactNode;
  actions: ReactNode;
}

/** Pantalla simple de resultado (pago completado / cancelado). */
export function StatusPage({ tone, title, children, actions }: StatusPageProps) {
  return (
    <main className="relative isolate grid min-h-screen place-items-center overflow-hidden px-4 py-16">
      <div className="grid-bg absolute inset-0 -z-10" aria-hidden="true" />
      <div
        className={`absolute left-1/2 top-1/3 -z-10 h-96 w-96 -translate-x-1/2 rounded-full blur-[120px] ${
          tone === "success" ? "bg-wa/20" : "bg-brand-violet/20"
        }`}
        aria-hidden="true"
      />
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <Logo href="/" />
        </div>
        <div className="rounded-3xl border border-white/[.08] bg-ink-900/80 p-8 shadow-2xl backdrop-blur">
          <div
            className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl ${
              tone === "success" ? "bg-wa/15 text-wa" : "bg-white/5 text-zinc-300"
            }`}
          >
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {tone === "success" ? <path d="M5 12.5l4.5 4.5L19 7.5" /> : <path d="M12 8v5M12 16.5v.5M10.3 3.9L2.4 17.5A2 2 0 004.1 20.5h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />}
            </svg>
          </div>
          <h1 className="mt-6 font-display text-2xl font-bold text-white">{title}</h1>
          <div className="mt-3 text-sm leading-relaxed text-zinc-400">{children}</div>
          <div className="mt-8 flex flex-col gap-3">{actions}</div>
        </div>
        <p className="mt-6 text-sm text-zinc-600">
          <Link href="/" className="transition hover:text-zinc-300">← Volver a la tienda</Link>
        </p>
      </div>
    </main>
  );
}
