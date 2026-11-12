"use client";

import { useMemo, useState } from "react";

import { inputClass } from "@/components/ui/fields";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import type { CustomerRow } from "@/types/database";

const dateFmt = new Intl.DateTimeFormat("es", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

/** "1990-04-12" → "12 abr 1990" (las fechas de nacimiento no tienen zona horaria). */
const formatDate = (iso: string | null) => (iso ? dateFmt.format(new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso)) : "—");

function age(birth: string | null): number | null {
  if (!birth) return null;
  const [y, m, d] = birth.split("-").map(Number);
  const now = new Date();
  let years = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) years--;
  return years;
}

/** Lista de clientes con búsqueda y exportación a CSV. */
export function CustomersTable({ customers }: { customers: CustomerRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [c.first_name, c.last_name, c.email, c.phone].filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [customers, query]);

  function exportCsv() {
    const header = ["Nombre", "Apellido", "Email", "Teléfono", "Fecha de nacimiento", "Registro"];
    const rows = filtered.map((c) => [c.first_name, c.last_name, c.email, c.phone, c.birth_date, c.created_at.slice(0, 10)]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "clientes-iqonic-thrive.csv" });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Clientes</h1>
          <p className="mt-1 text-sm text-zinc-500">{customers.length} registrados</p>
        </div>
        <div className="flex gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, correo o teléfono…"
            aria-label="Buscar clientes"
            className={`${inputClass} sm:w-72`}
          />
          <button
            type="button"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-40"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/[.07] bg-white/[.02]">
        {filtered.length === 0 ? (
          <p className="px-6 py-16 text-center text-zinc-400">
            {customers.length === 0 ? "Todavía no hay clientes registrados." : "Ningún cliente coincide con la búsqueda."}
          </p>
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-white/[.07] text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Cliente</th>
                <th scope="col" className="px-5 py-3 font-semibold">Teléfono</th>
                <th scope="col" className="px-5 py-3 font-semibold">Nacimiento</th>
                <th scope="col" className="px-5 py-3 font-semibold">Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[.06]">
              {filtered.map((c) => {
                const fullName = [c.first_name, c.last_name].filter(Boolean).join(" ");
                const years = age(c.birth_date);
                return (
                  <tr key={c.id}>
                    <td className="px-5 py-3">
                      <span className="block font-semibold text-white">{fullName || <span className="text-zinc-500">Sin nombre</span>}</span>
                      <a href={`mailto:${c.email}`} className="text-xs text-zinc-400 hover:text-white">{c.email}</a>
                    </td>
                    <td className="px-5 py-3">
                      {c.phone ? (
                        <a
                          href={buildWhatsAppUrl(`Hola ${c.first_name ?? ""}, te escribimos de IQONIC THRIVE.`, c.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-wa hover:underline"
                          title="Escribir por WhatsApp"
                        >
                          {c.phone}
                        </a>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-zinc-300">
                      {formatDate(c.birth_date)}
                      {years !== null && <span className="ml-2 text-xs text-zinc-500">({years} años)</span>}
                    </td>
                    <td className="px-5 py-3 text-zinc-400">{formatDate(c.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
