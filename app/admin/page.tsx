import { redirect } from "next/navigation";
import { Suspense } from "react";

import { signOut } from "@/app/admin/actions";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Spinner } from "@/components/ui/fields";
import { ProductsManager } from "@/components/admin/ProductsManager";
import { SetupNotice } from "@/components/admin/SetupNotice";
import { getAllProductsForAdmin } from "@/lib/admin-products";
import { getAdminSession } from "@/lib/auth";

/**
 * /admin — Panel protegido.
 *
 * Con Cache Components, leer la sesión (cookies) solo puede hacerse dentro
 * de un <Suspense>: el esqueleto se sirve al instante y el contenido
 * autenticado llega en streaming.
 */
export default function AdminPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const session = await getAdminSession();

  if (session.status === "anonymous") redirect("/admin/login");

  if (session.status === "unconfigured") {
    return (
      <Centered>
        <SetupNotice />
      </Centered>
    );
  }

  if (session.status === "db-missing") {
    return (
      <Centered>
        <div className="rounded-2xl border border-brand-gold/30 bg-brand-gold/10 p-6 text-sm leading-relaxed text-zinc-300">
          <p className="font-semibold text-brand-gold">Falta preparar la base de datos</p>
          <p className="mt-2">
            Iniciaste sesión correctamente, pero en Supabase todavía no existen la tabla de productos ni la de
            administradores. Abre <span className="text-white">SQL Editor → New query</span>, pega el contenido de{" "}
            <code className="text-white">supabase/migrations/0001_products.sql</code>, pulsa{" "}
            <span className="text-white">Run</span> y recarga esta página.
          </p>
          <form action={signOut} className="mt-5">
            <button type="submit" className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-white">
              Cerrar sesión
            </button>
          </form>
        </div>
      </Centered>
    );
  }

  if (session.status === "forbidden") {
    return (
      <Centered>
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-zinc-300">
          <p className="font-semibold text-red-300">Acceso denegado</p>
          <p className="mt-2">
            La cuenta <span className="text-white">{session.email ?? "actual"}</span> no es administradora. Añádela a la
            tabla <code className="text-white">admins</code> en Supabase (ver SUPABASE.md, paso 4).
          </p>
          <form action={signOut} className="mt-5">
            <button type="submit" className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-ink-950">
              Cerrar sesión
            </button>
          </form>
        </div>
      </Centered>
    );
  }

  const products = await getAllProductsForAdmin(session.supabase);

  return (
    <>
      <AdminHeader email={session.email} />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <ProductsManager products={products} />
      </main>
    </>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto grid min-h-screen max-w-md place-items-center px-4">{children}</main>;
}

function DashboardSkeleton() {
  return (
    <main className="grid min-h-screen place-items-center text-zinc-500" aria-busy="true">
      <span className="flex items-center gap-3 text-sm">
        <Spinner className="h-5 w-5" /> Cargando panel…
      </span>
    </main>
  );
}
