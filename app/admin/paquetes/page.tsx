import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { PackagesManager } from "@/components/admin/PackagesManager";
import { SetupNotice } from "@/components/admin/SetupNotice";
import { Spinner } from "@/components/ui/fields";
import { getAllPackagesForAdmin, getAllProductsForAdmin } from "@/lib/admin-products";
import { getAdminSession } from "@/lib/auth";

export const metadata = { title: "Paquetes · Panel IQONIC WELLNESS" };

/** /admin/paquetes — Crear, editar y eliminar paquetes (combos de productos). */
export default function AdminPackagesPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center text-sm text-zinc-500" aria-busy="true">
          <span className="flex items-center gap-3"><Spinner className="h-5 w-5" /> Cargando paquetes…</span>
        </main>
      }
    >
      <PackagesContent />
    </Suspense>
  );
}

async function PackagesContent() {
  const session = await getAdminSession();
  if (session.status === "anonymous") redirect("/admin/login");
  if (session.status === "unconfigured") return <SetupNotice />;
  // Sin permisos o sin tablas: /admin muestra el mensaje detallado
  if (session.status !== "admin") redirect("/admin");

  const [packages, products] = await Promise.all([
    getAllPackagesForAdmin(session.supabase),
    getAllProductsForAdmin(session.supabase),
  ]);

  return (
    <>
      <AdminHeader email={session.email} active="paquetes" />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {packages ? (
          <PackagesManager packages={packages} products={products} />
        ) : (
          <div className="rounded-2xl border border-brand-gold/30 bg-brand-gold/10 p-6 text-sm text-zinc-300">
            <p className="font-semibold text-brand-gold">Falta la tabla de paquetes</p>
            <p className="mt-2">
              Ejecuta <code className="text-white">supabase/migrations/0003_packages.sql</code> en el SQL Editor de
              Supabase y recarga esta página.
            </p>
          </div>
        )}
      </main>
    </>
  );
}
