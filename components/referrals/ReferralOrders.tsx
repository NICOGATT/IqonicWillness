import type { ReactNode } from "react";

import { LocalDate } from "@/components/ui/LocalDate";
import { siteConfig } from "@/config/site";
import type { PedidoReferidoEstado, PedidoReferidoRow, ResumenDistribuidor } from "@/types/database";

/** Métricas + historial de pedidos referidos del distribuidor (Server Components del /dashboard). */

const ESTADOS: Record<PedidoReferidoEstado, { label: string; className: string }> = {
  pendiente_whatsapp: { label: "Pendiente", className: "border-brand-gold/30 bg-brand-gold/10 text-brand-gold" },
  confirmado: { label: "Confirmado", className: "border-brand-violet/30 bg-brand-violet/10 text-brand-violet-light" },
  pagado: { label: "Pagado", className: "border-wa/30 bg-wa/10 text-wa" },
  enviado: { label: "Enviado", className: "border-sky-400/30 bg-sky-400/10 text-sky-300" },
  entregado: { label: "Entregado", className: "border-wa/30 bg-wa/10 text-wa" },
  cancelado: { label: "Cancelado", className: "border-white/10 bg-white/5 text-zinc-500" },
  reembolsado: { label: "Reembolsado", className: "border-white/10 bg-white/5 text-zinc-500" },
};

function formatMoney(value: number, currency = siteConfig.currency): string {
  try {
    return new Intl.NumberFormat(siteConfig.locale, { style: "currency", currency }).format(value);
  } catch {
    return value.toFixed(2);
  }
}

function summarizeItems(order: PedidoReferidoRow): string {
  return order.items.map((i) => `${i.cantidad}× ${i.nombre}`).join(", ") || "—";
}

/** Tarjetas de métricas del distribuidor (Resumen del dashboard). */
export function ReferralMetrics({ summary }: { summary: ResumenDistribuidor }) {
  const pendientes = summary.por_estado.pendiente_whatsapp ?? 0;
  const conversion = summary.total_pedidos > 0 ? Math.round((summary.pedidos_concretados / summary.total_pedidos) * 100) : 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        label="Pedidos generados"
        value={String(summary.total_pedidos)}
        detail={`${pendientes} ${pendientes === 1 ? "pendiente" : "pendientes"} de confirmar`}
        icon={<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" />}
        accent="text-brand-orange bg-brand-orange/10"
      />
      <MetricCard
        label="Concretados"
        value={String(summary.pedidos_concretados)}
        detail={`${conversion}% de los pedidos`}
        icon={<path d="M20 6L9 17l-5-5" />}
        accent="text-wa bg-wa/10"
      />
      <MetricCard
        label="Monto acumulado"
        value={formatMoney(summary.monto_total)}
        detail="Sin cancelados ni reembolsados"
        icon={<path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />}
        accent="text-brand-violet-light bg-brand-violet/10"
      />
      <MetricCard
        label="Monto concretado"
        value={formatMoney(summary.monto_concretado)}
        detail="Pagado, enviado o entregado"
        icon={<path d="M3 3v18h18M7 15l4-4 3 3 5-6" />}
        accent="text-brand-gold bg-brand-gold/10"
      />
    </div>
  );
}

/**
 * Historial de pedidos referidos (tabla en escritorio, tarjetas en móvil).
 * `total` = cantidad real en la BD, para avisar cuando la lista está recortada.
 */
export function ReferralOrdersTable({
  orders,
  total,
  title = "Pedidos de tu tienda",
  description = "Los que entraron con tu enlace. El estado lo actualiza el equipo.",
  action,
}: {
  orders: PedidoReferidoRow[];
  total: number;
  title?: string;
  description?: string;
  /** Enlace en la cabecera (p. ej. "Ver todos →"). */
  action?: ReactNode;
}) {
  return (
    <section aria-labelledby="orders-title" className="rounded-3xl border border-white/[.08] bg-white/[.02]">
        <header className="flex flex-wrap items-end justify-between gap-2 border-b border-white/[.06] px-6 py-5 sm:px-8">
          <div>
            <h2 id="orders-title" className="font-display text-lg font-bold text-white">
              {title}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">{description}</p>
          </div>
          {action ??
            (total > orders.length && (
              <p className="text-xs text-zinc-600">
                Últimos {orders.length} de {total}
              </p>
            ))}
        </header>

        {orders.length === 0 ? (
          <div className="px-6 py-14 text-center sm:px-8">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/5 text-zinc-500">
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 4h16v16H4zM4 9h16M9 4v16" />
              </svg>
            </span>
            <p className="mt-4 font-semibold text-white">Todavía no hay pedidos</p>
            <p className="mt-1 text-sm text-zinc-500">Comparte tu enlace: cada pedido que llegue aparecerá aquí.</p>
          </div>
        ) : (
          <>
            {/* Escritorio: tabla */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th scope="col" className="px-8 py-3 font-semibold">Fecha</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Cliente</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Productos</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
                    <th scope="col" className="px-8 py-3 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[.05]">
                  {orders.map((order) => (
                    <tr key={order.id} className="align-top transition hover:bg-white/[.02]">
                      <td className="whitespace-nowrap px-8 py-4 text-zinc-400">
                        <LocalDate iso={order.created_at} />
                      </td>
                      <td className="px-4 py-4">
                        <CustomerCell order={order} />
                      </td>
                      <td className="max-w-xs px-4 py-4 text-zinc-300">
                        <p className="line-clamp-2">{summarizeItems(order)}</p>
                      </td>
                      <td className="px-4 py-4">
                        <EstadoBadge estado={order.estado} />
                      </td>
                      <td className="whitespace-nowrap px-8 py-4 text-right font-semibold tabular-nums text-white">
                        <OrderTotal order={order} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Móvil: tarjetas */}
            <ul className="divide-y divide-white/[.06] md:hidden">
              {orders.map((order) => (
                <li key={order.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <CustomerCell order={order} />
                    <p className="shrink-0 text-right font-semibold tabular-nums text-white">
                      <OrderTotal order={order} />
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-zinc-400">{summarizeItems(order)}</p>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs text-zinc-500">
                    <LocalDate iso={order.created_at} />
                    <EstadoBadge estado={order.estado} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
    </section>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  accent: string;
}) {
  return (
    <div className="rounded-3xl border border-white/[.08] bg-white/[.02] p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${accent}`}>
          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {icon}
          </svg>
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-bold tabular-nums text-white">{value}</p>
      <p className="mt-1 text-sm text-zinc-500">{detail}</p>
    </div>
  );
}

function CustomerCell({ order }: { order: PedidoReferidoRow }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold text-white">{order.cliente_nombre || "Sin nombre"}</p>
      {order.cliente_telefono && (
        <a
          href={`https://wa.me/${order.cliente_telefono}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium tabular-nums text-wa underline-offset-4 hover:underline"
        >
          +{order.cliente_telefono}
        </a>
      )}
    </div>
  );
}

function OrderTotal({ order }: { order: PedidoReferidoRow }) {
  return (
    <>
      {formatMoney(order.total, order.moneda)}
      {order.tiene_items_sin_precio && <span className="block text-[11px] font-normal text-zinc-500">+ a consultar</span>}
    </>
  );
}

function EstadoBadge({ estado }: { estado: PedidoReferidoEstado }) {
  const { label, className } = ESTADOS[estado] ?? ESTADOS.pendiente_whatsapp;
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}
