import Link from "next/link";

import { LocalDate } from "@/components/ui/LocalDate";
import type { ClienteReferido } from "@/types/database";

/** Clientes registrados con el enlace del distribuidor (Server Component del /dashboard). */

/** Número para wa.me: el WhatsApp del perfil o, si falta, el teléfono (solo dígitos). */
function contactDigits(client: ClienteReferido): string | null {
  const digits = (client.whatsapp ?? client.phone ?? "").replace(/\D/g, "").replace(/^00/, "");
  return /^[0-9]{7,15}$/.test(digits) ? digits : null;
}

export function ReferredClientsTable({
  clients,
  total,
  page,
  pageSize,
}: {
  clients: ClienteReferido[];
  total: number;
  /** Página actual, desde 1. */
  page: number;
  pageSize: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <section aria-labelledby="clients-title" className="rounded-3xl border border-white/[.08] bg-white/[.02]">
      <header className="flex flex-wrap items-end justify-between gap-2 border-b border-white/[.06] px-6 py-5 sm:px-8">
        <div>
          <h2 id="clients-title" className="font-display text-lg font-bold text-white">
            {total} {total === 1 ? "cliente" : "clientes"}
          </h2>
          <p className="mt-1 text-sm text-zinc-500">Toca el número de un cliente para escribirle por WhatsApp.</p>
        </div>
        {pages > 1 && (
          <p className="text-xs text-zinc-600">
            {from}–{to} de {total}
          </p>
        )}
      </header>

      {clients.length === 0 ? (
        <div className="px-6 py-14 text-center sm:px-8">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/5 text-zinc-500">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          </span>
          <p className="mt-4 font-semibold text-white">
            {total > 0 ? "No hay clientes en esta página" : "Todavía no tienes clientes registrados"}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {total > 0
              ? "Vuelve a la primera página."
              : "Comparte tu enlace: quien cree su cuenta desde él aparecerá aquí."}
          </p>
        </div>
      ) : (
        <>
          {/* Escritorio: tabla */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th scope="col" className="px-8 py-3 font-semibold">Cliente</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Correo</th>
                  <th scope="col" className="px-4 py-3 font-semibold">WhatsApp</th>
                  <th scope="col" className="px-8 py-3 text-right font-semibold">Registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[.05]">
                {clients.map((client) => (
                  <tr key={client.id} className="transition hover:bg-white/[.02]">
                    <td className="px-8 py-4 font-semibold text-white">{client.full_name || "Sin nombre"}</td>
                    <td className="max-w-xs truncate px-4 py-4 text-zinc-300">{client.email}</td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <ContactLink client={client} />
                    </td>
                    <td className="whitespace-nowrap px-8 py-4 text-right text-zinc-400">
                      <LocalDate iso={client.created_at} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Móvil: tarjetas */}
          <ul className="divide-y divide-white/[.06] md:hidden">
            {clients.map((client) => (
              <li key={client.id} className="px-6 py-4">
                <p className="truncate font-semibold text-white">{client.full_name || "Sin nombre"}</p>
                <p className="truncate text-sm text-zinc-400">{client.email}</p>
                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-zinc-500">
                  <ContactLink client={client} />
                  <LocalDate iso={client.created_at} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {pages > 1 && <Pagination page={page} pages={pages} />}
    </section>
  );
}

function ContactLink({ client }: { client: ClienteReferido }) {
  const digits = contactDigits(client);
  if (!digits) return <span className="text-xs text-zinc-600">—</span>;
  return (
    <a
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs font-medium tabular-nums text-wa underline-offset-4 hover:underline"
    >
      +{digits}
    </a>
  );
}

function Pagination({ page, pages }: { page: number; pages: number }) {
  const linkClass =
    "rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/5 hover:text-white";
  const href = (p: number) => (p === 1 ? "/dashboard/clientes" : `/dashboard/clientes?pagina=${p}`);
  return (
    <nav aria-label="Páginas de clientes" className="flex items-center justify-between gap-3 border-t border-white/[.06] px-6 py-4 sm:px-8">
      {page > 1 ? (
        <Link href={href(page - 1)} className={linkClass}>
          ← Anterior
        </Link>
      ) : (
        <span />
      )}
      <p className="text-xs text-zinc-500">
        Página {page} de {pages}
      </p>
      {page < pages ? (
        <Link href={href(page + 1)} className={linkClass}>
          Siguiente →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
