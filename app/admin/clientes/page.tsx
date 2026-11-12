import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AdminHeader } from "@/components/admin/AdminHeader";
import { CustomersTable } from "@/components/admin/CustomersTable";
import { SetupNotice } from "@/components/admin/SetupNotice";
import { Spinner } from "@/components/ui/fields";
import { getCustomersForAdmin } from "@/lib/admin-products";
import { getAdminSession } from "@/lib/auth";

export const metadata = { title: "Clientes · Panel IQONIC THRIVE" };

/** /admin/clientes — Clientes registrados (solo lectura). */
export default function AdminCustomersPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center text-sm text-zinc-500" aria-busy="true">
          <span className="flex items-center gap-3"><Spinner className="h-5 w-5" /> Cargando clientes…</span>
        </main>
      }
    >
      <CustomersContent />
    </Suspense>
  );
}

async function CustomersContent() {
  const session = await getAdminSession();
  if (session.status === "anonymous") redirect("/admin/login");
  if (session.status === "unconfigured") return <SetupNotice />;
  // Sin permisos o sin tablas: /admin muestra el mensaje detallado
  if (session.status !== "admin") redirect("/admin");

  let customers;
  try {
    customers = await getCustomersForAdmin(session.supabase);
  } catch {
    customers = null;
  }

  return (
    <>
      <AdminHeader email={session.email} active="clientes" />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {customers ? (
          <CustomersTable customers={customers} />
        ) : (
          <div className="rounded-2xl border border-brand-gold/30 bg-brand-gold/10 p-6 text-sm text-zinc-300">
            <p className="font-semibold text-brand-gold">Falta la tabla de clientes</p>
            <p className="mt-2">
              Ejecuta <code className="text-white">supabase/migrations/0002_customers.sql</code> en el SQL Editor de
              Supabase y recarga esta página.
            </p>
          </div>
        )}
      </main>
    </>
  );
}
