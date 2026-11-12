import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { signOutCustomer } from "@/app/auth/actions";
import { ProfileForm } from "@/components/auth/ProfileForm";
import { SetupNotice } from "@/components/admin/SetupNotice";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { Spinner } from "@/components/ui/fields";
import { WhatsAppButton } from "@/components/whatsapp/WhatsAppButton";
import { getCustomerSession } from "@/lib/customer";

export const metadata = { title: "Mi cuenta · IQONIC WELLNESS", robots: { index: false } };

/**
 * /cuenta — Área privada del cliente.
 * La sesión se lee dentro de <Suspense> (requisito de Cache Components).
 */
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default function AccountPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <Navbar />
      <main className="mx-auto min-h-screen max-w-3xl px-4 pb-20 pt-28 sm:px-6 md:pt-36">
        <Suspense
          fallback={
            <p className="flex items-center gap-3 text-sm text-zinc-500">
              <Spinner className="h-5 w-5" /> Cargando tu cuenta…
            </p>
          }
        >
          <AccountContent searchParams={searchParams} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

async function AccountContent({ searchParams }: { searchParams: SearchParams }) {
  const session = await getCustomerSession();
  if (session.status === "unconfigured") return <SetupNotice />;
  if (session.status === "anonymous") redirect("/ingresar?next=/cuenta");

  const { ok } = await searchParams;
  const { profile, email } = session;
  const firstName = profile?.first_name;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-orange">Mi cuenta</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">
            {firstName ? `Hola, ${firstName}` : "Hola"} 👋
          </h1>
          <p className="mt-1 text-sm text-zinc-400">{email}</p>
        </div>
        <form action={signOutCustomer}>
          <button type="submit" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
            Cerrar sesión
          </button>
        </form>
      </header>

      {ok === "password" && (
        <p role="status" className="rounded-xl border border-wa/30 bg-wa/10 px-4 py-3 text-sm text-wa">
          Tu contraseña se cambió correctamente.
        </p>
      )}

      <section className="rounded-3xl border border-white/[.08] bg-white/[.02] p-6 sm:p-8">
        <h2 className="font-display text-lg font-bold text-white">Datos personales</h2>
        <p className="mt-1 text-sm text-zinc-500">Los usamos para preparar y entregar tus pedidos.</p>
        <div className="mt-6">
          <ProfileForm profile={profile} email={email} />
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-3xl border border-white/[.08] bg-white/[.02] p-6">
          <h2 className="font-display text-lg font-bold text-white">Seguridad</h2>
          <p className="mt-1 text-sm text-zinc-500">Tu contraseña está cifrada; nadie puede verla, ni siquiera nosotros.</p>
          <Link
            href="/cuenta/nueva-contrasena"
            className="mt-5 inline-flex rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            Cambiar contraseña
          </Link>
        </section>
        <section className="rounded-3xl border border-white/[.08] bg-white/[.02] p-6">
          <h2 className="font-display text-lg font-bold text-white">¿Quieres hacer un pedido?</h2>
          <p className="mt-1 text-sm text-zinc-500">Escríbenos y te atendemos al momento.</p>
          <WhatsAppButton
            className="mt-5"
            message={`Hola, soy ${[profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "cliente"} y quiero hacer un pedido.`}
          >
            Pedir por WhatsApp
          </WhatsAppButton>
        </section>
      </div>
    </div>
  );
}
