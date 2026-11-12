import Link from "next/link";

import { signOut } from "@/app/admin/actions";
import { Logo } from "@/components/ui/Logo";

export function AdminHeader({ email }: { email: string | null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[.07] bg-ink-950/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Logo href="/admin" />
          <span className="hidden rounded-full border border-brand-violet/30 bg-brand-violet/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-brand-violet-light sm:inline">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/" target="_blank" className="hidden text-sm text-zinc-400 transition hover:text-white sm:inline">
            Ver tienda ↗
          </Link>
          {email && <span className="hidden max-w-[200px] truncate text-sm text-zinc-500 md:inline">{email}</span>}
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Salir
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
