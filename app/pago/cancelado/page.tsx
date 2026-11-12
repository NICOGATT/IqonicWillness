import Link from "next/link";

import { StatusPage } from "@/components/layout/StatusPage";
import { WhatsAppButton } from "@/components/whatsapp/WhatsAppButton";

export const metadata = { title: "Pago cancelado · IQONIC WELLNESS", robots: { index: false } };

/** Stripe redirige aquí si el cliente cancela el pago (cancel_url de la API Express). */
export default function PaymentCancelledPage() {
  return (
    <StatusPage
      tone="neutral"
      title="El pago no se completó"
      actions={
        <>
          <Link href="/#productos" className="rounded-2xl bg-white px-5 py-3.5 text-sm font-bold text-ink-950 transition hover:bg-zinc-200">
            Volver a los productos
          </Link>
          <WhatsAppButton fullWidth variant="outline" message="Hola, tuve un problema al pagar en la web. ¿Me ayudan con mi pedido?">
            Prefiero pedir por WhatsApp
          </WhatsAppButton>
        </>
      }
    >
      No se realizó ningún cargo. Puedes intentarlo de nuevo o hacer tu pedido por WhatsApp.
    </StatusPage>
  );
}
