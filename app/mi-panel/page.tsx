import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { SetupNotice } from "@/components/admin/SetupNotice";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { DistributorProfileForm } from "@/components/referrals/DistributorProfileForm";
import { ReferralOrders } from "@/components/referrals/ReferralOrders";
import { Spinner } from "@/components/ui/fields";
import { siteConfig } from "@/config/site";
import { getCustomerSession } from "@/lib/customer";
import { getMyDistributorStats } from "@/lib/referrals";

export const metadata = { title: "Mi tienda · IQONIC WELLNESS", robots: { index: false } };

/**
 * /mi-panel — Panel del distribuidor (tienda replicada).
 * Configuración del enlace, botón para compartirlo y pedidos referidos.
 * El proxy redirige sin sesión; aquí se vuelve a validar (getMyDistributorStats).
 */
export default function DistributorPanelPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto min-h-screen max-w-4xl px-4 pb-20 pt-28 sm:px-6 md:pt-36">
        <Suspense
          fallback={
            <p className="flex items-center gap-3 text-sm text-zinc-500">
              <Spinner className="h-5 w-5" /> Cargando tu tienda…
            </p>
          }
        >
          <PanelContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

async function PanelContent() {
  const stats = await getMyDistributorStats();
  if (stats.status === "unconfigured") return <SetupNotice />;
  if (stats.status === "anonymous") redirect("/ingresar?next=/mi-panel");

  const profile = stats.status === "ok" ? stats.profile : null;
  // Primera vez: sugerimos el nombre del perfil de cliente
  let suggestedName: string | undefined;
  if (stats.status === "no-profile") {
    const session = await getCustomerSession();
    if (session.status === "customer") {
      suggestedName = [session.profile?.first_name, session.profile?.last_name].filter(Boolean).join(" ") || undefined;
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-orange">Panel distribuidor</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">
            {profile ? (
              <>
                Tienda de <span className="text-gradient">{profile.nombre_mostrar}</span>
              </>
            ) : (
              "Tu tienda IQONIC"
            )}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {profile
              ? "Comparte tu enlace y sigue los pedidos que llegan por él."
              : "Crea tu enlace personal: tus clientes compran en la tienda y el pedido te llega a ti por WhatsApp."}
          </p>
        </div>
        <Link
          href="/cuenta"
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 sm:self-auto"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M11 18l-6-6 6-6" />
          </svg>
          Mi cuenta
        </Link>
      </header>

      {stats.status === "error" && (
        <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {stats.error} Recarga la página en unos segundos.
        </p>
      )}

      {stats.status !== "error" && (
        <DistributorProfileForm
          // Tras guardar, el formulario conserva su estado (y el aviso) aunque router.refresh() traiga el perfil nuevo
          profile={profile}
          siteUrl={siteConfig.url}
          suggestedName={suggestedName}
        />
      )}

      {stats.status === "ok" && <ReferralOrders summary={stats.summary} orders={stats.orders} />}
    </div>
  );
}
