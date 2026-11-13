"use client";

import { useMemo, useState, useTransition } from "react";

import { updateOrder } from "@/app/admin/actions";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { inputClass, Spinner } from "@/components/ui/fields";
import type { AdminOrder } from "@/lib/admin-products";
import { formatMoney, ORDER_CHANNEL_LABEL, ORDER_STATUS_META } from "@/lib/orders";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { ORDER_STATUSES, type OrderStatus } from "@/types/database";

const dateFmt = new Intl.DateTimeFormat("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/** Lista de pedidos: filtro por estado, búsqueda y cambio de estado. */
export function OrdersManager({ orders }: { orders: AdminOrder[] }) {
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const map = new Map<OrderStatus, number>();
    for (const o of orders) map.set(o.status, (map.get(o.status) ?? 0) + 1);
    return map;
  }, [orders]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^#/, "");
    return orders.filter((o) => {
      if (filter !== "all" && o.status !== filter) return false;
      if (!q) return true;
      return [String(o.number), o.contact_name, o.contact_email, o.contact_phone, ...o.items.map((i) => i.name)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [orders, filter, query]);

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Pedidos</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {orders.length} {orders.length === 1 ? "pedido" : "pedidos"} · los más recientes primero
          </p>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por #, cliente o producto…"
          aria-label="Buscar pedidos"
          className={`${inputClass} sm:w-72`}
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-2" role="toolbar" aria-label="Filtrar por estado">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="Todos" count={orders.length} />
        {ORDER_STATUSES.map((s) =>
          counts.get(s) ? (
            <FilterChip
              key={s}
              active={filter === s}
              onClick={() => setFilter(s)}
              label={ORDER_STATUS_META[s].label}
              count={counts.get(s) ?? 0}
            />
          ) : null,
        )}
      </div>

      {visible.length === 0 ? (
        <p className="mt-16 text-center text-sm text-zinc-500">
          {orders.length === 0
            ? "Todavía no hay pedidos. Aparecen aquí cuando un cliente toca “Pedir por WhatsApp” en el carrito."
            : "Ningún pedido coincide con el filtro."}
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {visible.map((order) => (
            <OrderRowCard key={order.id} order={order} />
          ))}
        </ul>
      )}
    </>
  );
}

function FilterChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
        active ? "border-white bg-white text-ink-950" : "border-white/12 text-zinc-300 hover:border-white/30"
      }`}
    >
      {label} <span className={active ? "text-ink-950/60" : "text-zinc-500"}>{count}</span>
    </button>
  );
}

function OrderRowCard({ order }: { order: AdminOrder }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [notes, setNotes] = useState(order.admin_notes ?? "");
  const meta = ORDER_STATUS_META[order.status];
  const units = order.items.reduce((sum, i) => sum + i.quantity, 0);

  function save(status: OrderStatus, adminNotes?: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await updateOrder({ id: order.id, status, adminNotes });
      setMessage({ ok: result.status === "success", text: result.message ?? "" });
    });
  }

  return (
    <li className="rounded-2xl border border-white/[.07] bg-white/[.02]">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-lg font-bold text-white">#{order.number}</span>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}>{meta.label}</span>
            <span className="text-xs text-zinc-500">
              {ORDER_CHANNEL_LABEL[order.channel]} · {dateFmt.format(new Date(order.created_at))}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-zinc-300">
            {order.contact_name ?? <span className="text-zinc-500">Cliente sin cuenta</span>}
            {order.contact_phone && <span className="text-zinc-500"> · {order.contact_phone}</span>}
            {order.contact_email && <span className="text-zinc-500"> · {order.contact_email}</span>}
          </p>
          <p className="mt-1 truncate text-sm text-zinc-500">
            {units} {units === 1 ? "unidad" : "unidades"}: {order.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
          </p>
        </div>

        <div className="flex items-center gap-3 sm:flex-col sm:items-end">
          <p className="font-display text-xl font-bold text-white">
            {formatMoney(order.total, order.currency)}
            {order.has_unpriced_items && <span className="ml-1 text-xs font-normal text-zinc-500">+ a consultar</span>}
          </p>
          <label className="flex items-center gap-2">
            <span className="sr-only">Estado del pedido #{order.number}</span>
            {pending && <Spinner className="h-4 w-4" />}
            <select
              value={order.status}
              disabled={pending}
              onChange={(e) => save(e.target.value as OrderStatus)}
              className="rounded-xl border border-white/10 bg-ink-800 px-3 py-2 text-sm font-semibold text-white focus:border-white/30 focus:outline-none"
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_META[s].label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <details className="group border-t border-white/[.06]">
        <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-semibold text-zinc-400 transition hover:text-white sm:px-5">
          <span className="group-open:hidden">Ver detalle ▾</span>
          <span className="hidden group-open:inline">Ocultar detalle ▴</span>
        </summary>
        <div className="grid gap-6 px-4 pb-5 sm:px-5 lg:grid-cols-[1fr_320px]">
          <div>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="pb-2 font-semibold">Producto</th>
                  <th className="pb-2 text-right font-semibold">Cant.</th>
                  <th className="pb-2 text-right font-semibold">Precio</th>
                  <th className="pb-2 text-right font-semibold">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[.05]">
                {order.items.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="py-2 pr-3">
                      <p className="font-semibold text-white">
                        {item.kind === "package" && <span className="text-brand-violet-light">Paquete · </span>}
                        {item.name}
                      </p>
                      {item.detail && <p className="text-xs text-zinc-500">{item.detail}</p>}
                    </td>
                    <td className="py-2 text-right tabular-nums">{item.quantity}</td>
                    <td className="py-2 text-right tabular-nums">
                      {item.unit_price === null ? "—" : formatMoney(item.unit_price, order.currency)}
                    </td>
                    <td className="py-2 text-right font-semibold tabular-nums text-white">
                      {item.line_total === null ? "A consultar" : formatMoney(item.line_total, order.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {order.customer_note && (
              <p className="mt-4 rounded-xl border border-white/[.06] bg-black/20 px-3.5 py-2.5 text-sm text-zinc-300">
                <span className="font-semibold text-zinc-500">Comentario del cliente: </span>
                {order.customer_note}
              </p>
            )}
            {order.paid_at && (
              <p className="mt-3 text-xs text-zinc-500">Pagado el {dateFmt.format(new Date(order.paid_at))}</p>
            )}
          </div>

          <div className="space-y-3">
            {order.contact_phone && (
              <a
                href={buildWhatsAppUrl(
                  `Hola${order.contact_name ? ` ${order.contact_name.split(" ")[0]}` : ""}, te escribimos de IQONIC WELLNESS por tu pedido #${order.number}.`,
                  order.contact_phone,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-wa/30 bg-wa/10 px-4 py-2.5 text-sm font-semibold text-wa transition hover:bg-wa hover:text-ink-950"
              >
                <WhatsAppIcon className="h-4 w-4" />
                Escribir al cliente
              </a>
            )}
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500" htmlFor={`notes-${order.id}`}>
              Notas internas
            </label>
            <textarea
              id={`notes-${order.id}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Ej.: pagó por transferencia, entrega el jueves…"
              className={`${inputClass} resize-none`}
            />
            <button
              type="button"
              disabled={pending || notes === (order.admin_notes ?? "")}
              onClick={() => save(order.status, notes)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-40"
            >
              Guardar notas
            </button>
          </div>
        </div>
      </details>

      {message && (
        <p
          role="status"
          className={`border-t border-white/[.06] px-4 py-2 text-xs sm:px-5 ${message.ok ? "text-wa" : "text-red-300"}`}
        >
          {message.text}
        </p>
      )}
    </li>
  );
}
