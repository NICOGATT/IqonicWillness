import { redirect } from "next/navigation";

import { SetupNotice } from "@/components/admin/SetupNotice";
import { ErrorNotice, NotDistributorNotice, PageHeader } from "@/components/dashboard/PanelParts";
import { DistributorProfileForm } from "@/components/referrals/DistributorProfileForm";
import { siteConfig } from "@/config/site";
import { getCustomerSession } from "@/lib/customer";
import { getMyDistributorStats } from "@/lib/referrals";

export const metadata = { title: "Mi tienda" };

/** /dashboard/tienda — Crear o editar la tienda replicada (nombre, enlace, WhatsApp). */
export default async function DashboardStorePage() {
  const stats = await getMyDistributorStats({ limit: 1 });
  if (stats.status === "unconfigured") return <SetupNotice />;
  if (stats.status === "anonymous") redirect("/ingresar?next=/dashboard/tienda");
  if (stats.status === "error") return <ErrorNotice message={stats.error} />;
  if (stats.status === "not-distributor") {
    return (
      <>
        <PageHeader eyebrow="Mi tienda" title="Mi tienda" />
        <NotDistributorNotice />
      </>
    );
  }

  const profile = stats.status === "ok" ? stats.profile : null;

  // Primera vez: sugerimos el nombre del perfil de cliente
  let suggestedName: string | undefined;
  if (!profile) {
    const session = await getCustomerSession();
    if (session.status === "customer") {
      suggestedName = [session.profile?.first_name, session.profile?.last_name].filter(Boolean).join(" ") || undefined;
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Mi tienda"
        title="Mi tienda"
        description={
          profile
            ? "Tu nombre, tu enlace y el WhatsApp donde recibes los pedidos."
            : "Elige cómo te verán tus clientes y a qué WhatsApp llegarán sus pedidos."
        }
      />
      <DistributorProfileForm profile={profile} siteUrl={siteConfig.url} suggestedName={suggestedName} />
    </>
  );
}
