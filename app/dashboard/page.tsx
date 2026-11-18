import Link from "next/link";
import { redirect } from "next/navigation";

import { SetupNotice } from "@/components/admin/SetupNotice";
import { CreateStoreCTA, ErrorNotice, PageHeader, PausedNotice } from "@/components/dashboard/PanelParts";
import { ShareLinkPanel } from "@/components/dashboard/ShareLinkPanel";
import { ReferralMetrics, ReferralOrdersTable } from "@/components/referrals/ReferralOrders";
import { siteConfig } from "@/config/site";
import { getMyDistributorStats } from "@/lib/referrals";

export const metadata = { title: "Resumen" };

/** /dashboard — Resumen: métricas, enlace para compartir y últimos pedidos. */
export default async function DashboardHomePage() {
  const stats = await getMyDistributorStats({ limit: 5 });
  if (stats.status === "unconfigured") return <SetupNotice />;
  if (stats.status === "anonymous") redirect("/ingresar?next=/dashboard");
  if (stats.status === "error") return <ErrorNotice message={stats.error} />;

  if (stats.status === "no-profile") {
    return (
      <>
        <PageHeader eyebrow="Bienvenido/a" title="Tu tienda IQONIC" description="Todavía no configuraste tu tienda." />
        <CreateStoreCTA />
      </>
    );
  }

  const { profile, summary, orders } = stats;
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Resumen"
        title={
          <>
            Hola, <span className="text-gradient">{profile.nombre_mostrar}</span>
          </>
        }
        description="Así va tu tienda. Los estados de los pedidos los actualiza el equipo."
      />

      {!profile.activo && <PausedNotice />}

      <ReferralMetrics summary={summary} />

      <ShareLinkPanel siteUrl={siteConfig.url} slug={profile.slug} name={profile.nombre_mostrar} />

      <ReferralOrdersTable
        orders={orders}
        total={summary.total_pedidos}
        title="Últimos pedidos"
        description="Los más recientes que entraron con tu enlace."
        action={
          summary.total_pedidos > 0 && (
            <Link href="/dashboard/pedidos" className="text-sm font-semibold text-brand-violet-light hover:text-white">
              Ver todos →
            </Link>
          )
        }
      />
    </div>
  );
}
