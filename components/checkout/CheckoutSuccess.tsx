import Link from "next/link";

import { CheckIcon, PaymentIcon } from "@/components/checkout/CheckoutIcons";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import type { PaymentMethod } from "@/lib/checkout";

interface CheckoutSuccessProps {
  /** null = no se pudo registrar en Supabase, pero el mensaje salió igual. */
  orderNumber: number | null;
  whatsappUrl: string;
  method: PaymentMethod;
}

/** Confirmación tras enviar el pedido por WhatsApp. */
export function CheckoutSuccess({ orderNumber, whatsappUrl, method }: CheckoutSuccessProps) {
  const steps = [
    "Envía el mensaje que se abrió en WhatsApp: así confirmamos tu pedido.",
    method.nextStep,
    "Te avisamos cuando tu pedido esté en camino.",
  ];

  return (
    <div className="mx-auto max-w-lg text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-wa/15 text-wa">
        <CheckIcon className="h-8 w-8" />
      </span>
      <h1 className="mt-6 font-display text-3xl font-bold text-white">
        {orderNumber ? `Pedido #${orderNumber} registrado` : "¡Ya casi está!"}
      </h1>
      <p className="mt-3 inline-flex items-center gap-1.5 text-zinc-400">
        <PaymentIcon id={method.id} className="h-4 w-4" />
        Forma de pago: <span className="font-semibold text-white">{method.summary.toLowerCase()}</span>
      </p>

      <ol className="mt-8 space-y-3 text-left">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-3.5 rounded-2xl border border-white/[.07] bg-white/[.025] p-4 text-sm leading-relaxed text-zinc-300">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/[.07] font-display text-sm font-bold text-white">
              {index + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-wa inline-flex items-center justify-center gap-2.5 rounded-2xl px-5 py-3.5 text-sm font-bold text-ink-950"
        >
          <WhatsAppIcon className="h-5 w-5" />
          ¿No se abrió? Abrir WhatsApp
        </a>
        <Link
          href="/#productos"
          className="rounded-2xl border border-white/10 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-white/5"
        >
          Seguir comprando
        </Link>
      </div>
    </div>
  );
}
