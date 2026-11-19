import Link from "next/link";
import type { ReactNode } from "react";

import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { siteConfig } from "@/config/site";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

/** Piezas comunes de las páginas del dashboard (Server Components). */

export function PageHeader({ eyebrow, title, description, action }: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-orange">{eyebrow}</p>}
        <h1 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-zinc-400">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function ErrorNotice({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
      {message} Recarga la página en unos segundos.
    </p>
  );
}

export function PausedNotice() {
  return (
    <p role="status" className="rounded-2xl border border-brand-gold/30 bg-brand-gold/10 px-4 py-3 text-sm text-brand-gold">
      Tu tienda está <strong>pausada</strong> por el equipo de {siteConfig.name}: los pedidos de tu enlace llegan a la tienda
      principal. Escríbenos si crees que es un error.
    </p>
  );
}

/** Un cliente entró al panel: no tiene rol de distribuidor. */
export function NotDistributorNotice() {
  const message = "Hola, ya tengo mi número de distribuidor IQONIC y quiero activar mi cuenta como distribuidor/a en la web.";
  return (
    <section className="rounded-3xl border border-white/[.08] bg-white/[.02] px-6 py-12 text-center sm:px-8">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/5 text-zinc-400">
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="10" width="16" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 018 0v3" />
        </svg>
      </span>
      <h2 className="mt-4 font-display text-xl font-bold text-white">El panel es para distribuidores</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-zinc-400">
        Tu cuenta está registrada como cliente. Si ya tienes tu número de distribuidor IQONIC, escríbenos y activamos tu
        cuenta de distribuidor.
      </p>
      <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
        <a
          href={buildWhatsAppUrl(message)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-wa inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-ink-950"
        >
          <WhatsAppIcon className="h-5 w-5" />
          Activar mi cuenta
        </a>
        <Link
          href="/cuenta"
          className="inline-flex items-center justify-center rounded-2xl border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/40"
        >
          Ir a mi cuenta
        </Link>
      </div>
    </section>
  );
}

/** "Iqonic ID · 123456" junto al saludo del panel. */
export function IqonicIdBadge({ iqonicId }: { iqonicId: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400">
      Iqonic ID
      <strong className="font-semibold tabular-nums tracking-wide text-white">{iqonicId}</strong>
    </span>
  );
}

/** Usuario con cuenta pero sin tienda creada todavía. */
export function CreateStoreCTA() {
  const steps = [
    { title: "Elige tu nombre y enlace", text: "Así te verán tus clientes: tienda.com/?ref=tu-nombre" },
    { title: "Agrega tu WhatsApp", text: "Los pedidos de tu enlace llegan directo a tu chat." },
    { title: "Comparte y mide", text: "Sigue aquí cada pedido y lo que generaste." },
  ];
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/[.08] bg-gradient-to-br from-brand-violet/[.14] via-white/[.02] to-brand-orange/[.10] p-6 sm:p-10">
      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-violet/20 blur-3xl" aria-hidden="true" />
      <div className="relative">
        <h2 className="font-display text-xl font-bold text-white sm:text-2xl">Crea tu tienda en un minuto</h2>
        <p className="mt-1 max-w-xl text-sm text-zinc-400">
          Tus clientes compran en la tienda oficial y el pedido te llega a ti por WhatsApp.
        </p>
        <ol className="mt-6 grid gap-3 sm:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title} className="rounded-2xl border border-white/[.08] bg-ink-950/50 p-4">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-xs font-bold text-white">{i + 1}</span>
              <p className="mt-3 text-sm font-semibold text-white">{step.title}</p>
              <p className="mt-1 text-xs text-zinc-500">{step.text}</p>
            </li>
          ))}
        </ol>
        <Link
          href="/dashboard/tienda"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-orange to-brand-violet px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-violet/20 transition hover:brightness-110"
        >
          Crear mi tienda
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
