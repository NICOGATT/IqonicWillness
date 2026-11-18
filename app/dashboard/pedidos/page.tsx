import { redirect } from "next/navigation";

import { SetupNotice } from "@/components/admin/SetupNotice";
import { CreateStoreCTA, ErrorNotice, PageHeader } from "@/components/dashboard/PanelParts";
import { ReferralOrdersTable } from "@/components/referrals/ReferralOrders";
import { getMyDistributorStats } from "@/lib/referrals";

export const metadata = { title: "Pedidos" };

/** Máximo que permite getMyDistributorStats(); si hay más, la tabla lo avisa. */
const LIMIT = 200;

/** /dashboard/pedidos — Historial completo de pedidos referidos. */
export default async function DashboardOrdersPage() {
  const stats = await getMyDistributorStats({ limit: LIMIT });
  if (stats.status === "unconfigured") return <SetupNotice />;
  if (stats.status === "anonymous") redirect("/ingresar?next=/dashboard/pedidos");
  if (stats.status === "error") return <ErrorNotice message={stats.error} />;

  return (
    <>
      <PageHeader
        eyebrow="Pedidos"
        title="Pedidos de tu tienda"
        description="Cada pedido que entró con tu enlace, del más nuevo al más antiguo."
      />
      {stats.status === "no-profile" ? (
        <CreateStoreCTA />
      ) : (
        <ReferralOrdersTable
          orders={stats.orders}
          total={stats.summary.total_pedidos}
          title={`${stats.summary.total_pedidos} ${stats.summary.total_pedidos === 1 ? "pedido" : "pedidos"}`}
          description="Toca el teléfono de un cliente para escribirle por WhatsApp."
        />
      )}
    </>
  );
}
