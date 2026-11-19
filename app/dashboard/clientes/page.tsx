import Link from "next/link";
import { redirect } from "next/navigation";

import { SetupNotice } from "@/components/admin/SetupNotice";
import { ErrorNotice, IqonicIdBadge, NotDistributorNotice, PageHeader } from "@/components/dashboard/PanelParts";
import { ReferredClientsTable } from "@/components/referrals/ReferredClientsTable";
import { getMyReferredClients } from "@/lib/referrals";

export const metadata = { title: "Clientes" };

const PAGE_SIZE = 50;

/**
 * /dashboard/clientes — Clientes que se registraron con el enlace del distribuidor
 * (customers.referred_by_iqonic_id = su iqonic_id). RLS garantiza que solo vea los suyos.
 */
export default async function DashboardClientsPage({ searchParams }: PageProps<"/dashboard/clientes">) {
  const { pagina } = await searchParams;
  const requested = Number.parseInt(typeof pagina === "string" ? pagina : "1", 10);
  const page = Number.isFinite(requested) && requested > 0 ? requested : 1;

  const result = await getMyReferredClients({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
  if (result.status === "unconfigured") return <SetupNotice />;
  if (result.status === "anonymous") redirect("/ingresar?next=/dashboard/clientes");
  if (result.status === "error") return <ErrorNotice message={result.error} />;
  if (result.status === "not-distributor") {
    return (
      <>
        <PageHeader eyebrow="Clientes" title="Mis clientes" />
        <NotDistributorNotice />
      </>
    );
  }

  if (result.status === "no-iqonic-id") {
    return (
      <>
        <PageHeader eyebrow="Clientes" title="Mis clientes" />
        <section className="rounded-3xl border border-white/[.08] bg-white/[.02] px-6 py-10 text-center sm:px-8">
          <p className="font-semibold text-white">Tu cuenta todavía no tiene un Iqonic ID asociado</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">
            Para ver a los clientes que se registran con tu enlace necesitas tu número de distribuidor IQONIC asociado a tu
            cuenta. Escríbenos y lo activamos.
          </p>
          <Link href="/dashboard" className="mt-5 inline-block text-sm font-semibold text-brand-violet-light hover:text-white">
            ← Volver al resumen
          </Link>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Clientes"
        title="Mis clientes"
        description="Personas que crearon su cuenta con tu link de invitación."
        action={<IqonicIdBadge iqonicId={result.iqonicId} />}
      />
      <ReferredClientsTable clients={result.clients} total={result.total} page={page} pageSize={PAGE_SIZE} />
    </>
  );
}
