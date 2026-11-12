import Link from "next/link";

import { LoginForm } from "@/components/admin/LoginForm";
import { SetupNotice } from "@/components/admin/SetupNotice";
import { Logo } from "@/components/ui/Logo";
import { isSupabaseConfigured } from "@/utils/supabase/env";

export const metadata = { title: "Iniciar sesión · Panel IQONIC THRIVE" };

/**
 * Login del panel (Email + Password de Supabase Auth).
 * Si ya hay sesión, proxy.ts redirige directamente a /admin.
 */
export default function LoginPage() {
  const configured = isSupabaseConfigured();

  return (
    <main className="relative isolate grid min-h-screen place-items-center overflow-hidden px-4 py-16">
      <div className="grid-bg absolute inset-0 -z-10" aria-hidden="true" />
      <div className="absolute left-1/2 top-1/3 -z-10 h-80 w-80 -translate-x-1/2 rounded-full bg-brand-violet/20 blur-[110px]" aria-hidden="true" />

      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo href="/" />
        </div>
        <div className="rounded-3xl border border-white/[.08] bg-ink-900/80 p-7 shadow-2xl backdrop-blur">
          <h1 className="font-display text-xl font-bold text-white">Panel de administración</h1>
          <p className="mt-1 text-sm text-zinc-500">Accede con tu cuenta de administrador.</p>
          <div className="mt-7">{configured ? <LoginForm /> : <SetupNotice />}</div>
        </div>
        <p className="mt-6 text-center text-sm text-zinc-600">
          <Link href="/" className="transition hover:text-zinc-300">← Volver a la tienda</Link>
        </p>
      </div>
    </main>
  );
}
