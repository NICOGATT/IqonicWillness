import Link from "next/link";

import { signOut } from "@/app/admin/actions";
import { Logo } from "@/components/ui/Logo";

const sections = [
  { href: "/admin/pedidos", label: "Pedidos", id: "pedidos" },
  { href: "/admin", label: "Productos", id: "productos" },
  { href: "/admin/paquetes", label: "Paquetes", id: "paquetes" },
  { href: "/admin/clientes", label: "Clientes", id: "clientes" },
] as const;

type SectionId = (typeof sections)[number]["id"];

export function AdminHeader({ email, active = "productos" }: { email: string | null; active?: SectionId }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/[.07] bg-ink-950/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 sm:gap-6">
          <Logo href="/admin" showMark />
          <nav aria-label="Secciones del panel" className="flex gap-1">
            {sections.map((s) => (
              <Link
                key={s.id}
                href={s.href}
                aria-current={active === s.id ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  active === s.id ? "bg-white/10 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                {s.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/" target="_blank" className="hidden text-sm text-zinc-400 transition hover:text-white lg:inline">
            Ver tienda ↗
          </Link>
          {email && <span className="hidden max-w-[200px] truncate text-sm text-zinc-500 xl:inline">{email}</span>}
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
