import Link from "next/link";
import { redirect } from "next/navigation";

import { SetupNotice } from "@/components/admin/SetupNotice";
import {
  CreateStoreCTA,
  ErrorNotice,
  IqonicIdBadge,
  NotDistributorNotice,
  PageHeader,
  PausedNotice,
} from "@/components/dashboard/PanelParts";
import { ShareLinkPanel } from "@/components/dashboard/ShareLinkPanel";
import { ReferralMetrics, ReferralOrdersTable } from "@/components/referrals/ReferralOrders";
import { ReferredClientsTable } from "@/components/referrals/ReferredClientsTable";
import { siteConfig } from "@/config/site";
import { getDistributorOverview } from "@/lib/referrals";

export const metadata = { title: "Resumen" };

const viewAll = (href: string) => (
  <Link href={href} className="text-sm font-semibold text-brand-violet-light hover:text-white">
    Ver todos →
  </Link>
);

/**
 * /dashboard — Resumen del distribuidor:
 *   1. Su link de invitación (copiar / compartir por WhatsApp).
 *   2. Métricas: clientes registrados, pedidos, compras concretadas y monto.
 *   3. Sus últimos clientes (RLS: solo los que tienen referred_by_iqonic_id = su iqonic_id).
 *   4. Sus últimos pedidos, o cómo crear su tienda para recibirlos.
 */
export default async function DashboardHomePage() {
  const data = await getDistributorOverview({ latest: 5 });
  if (data.status === "unconfigured") return <SetupNotice />;
  if (data.status === "anonymous") redirect("/ingresar?next=/dashboard");
  if (data.status === "error") return <ErrorNotice message={data.error} />;
  if (data.status === "not-distributor") {
    return (
      <>
        <PageHeader eyebrow="Panel distribuidor" title="Panel de distribuidor" />
        <NotDistributorNotice />
      </>
    );
  }

  const { name, iqonicId, referralRef, store, clients, sales } = data;
  const firstName = name.split(" ")[0];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Resumen"
        title={
          <>
            Hola, <span className="text-gradient">{firstName}</span>
          </>
        }
        description={
          store
            ? "Así va tu red. Los estados de los pedidos los actualiza el equipo."
            : "Comparte tu link: cada persona que se registre con él quedará como tu cliente."
        }
        action={iqonicId && <IqonicIdBadge iqonicId={iqonicId} />}
      />

      {store && !store.activo && <PausedNotice />}

      {referralRef && <ShareLinkPanel siteUrl={siteConfig.url} slug={referralRef} name={name} hasStore={Boolean(store?.activo)} />}

      <ReferralMetrics summary={sales?.summary ?? null} clients={clients && { total: clients.total, nuevos: clients.nuevos }} />

      {clients && (
        <ReferredClientsTable
          clients={clients.latest}
          total={clients.total}
          title="Mis clientes"
          description={
            clients.total > 0
              ? `Los más recientes de ${clients.total}. Toca su número para escribirle por WhatsApp.`
              : "Las personas que creen su cuenta con tu link."
          }
          action={clients.total > clients.latest.length && viewAll("/dashboard/clientes")}
        />
      )}

      {sales ? (
        <ReferralOrdersTable
          orders={sales.orders}
          total={sales.summary.total_pedidos}
          title="Últimos pedidos"
          description="Los más recientes que entraron con tu enlace."
          action={sales.summary.total_pedidos > 0 && viewAll("/dashboard/pedidos")}
        />
      ) : (
        <CreateStoreCTA />
      )}
    </div>
  );
}
