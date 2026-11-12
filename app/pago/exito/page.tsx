import Link from "next/link";

import { StatusPage } from "@/components/layout/StatusPage";
import { WhatsAppButton } from "@/components/whatsapp/WhatsAppButton";

export const metadata = { title: "¡Pago recibido! · IQONIC THRIVE", robots: { index: false } };

/**
 * Stripe redirige aquí tras un pago correcto (success_url de la API Express).
 * La confirmación fiable del cobro llega por el webhook de Stripe en la API;
 * esta página solo agradece y da el siguiente paso.
 */
export default function PaymentSuccessPage() {
  return (
    <StatusPage
      tone="success"
      title="¡Gracias por tu compra!"
      actions={
        <>
          <WhatsAppButton fullWidth message="Hola, acabo de pagar un pedido en la web y quiero coordinar la entrega.">
            Coordinar entrega por WhatsApp
          </WhatsAppButton>
          <Link href="/#productos" className="rounded-2xl border border-white/10 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-white/5">
            Seguir comprando
          </Link>
        </>
      }
    >
      Recibimos tu pago. Stripe te enviará el comprobante por correo y nos pondremos en contacto para coordinar la entrega.
    </StatusPage>
  );
}
