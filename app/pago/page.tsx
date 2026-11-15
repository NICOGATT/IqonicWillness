import { redirect } from "next/navigation";
import { Suspense } from "react";

import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { Spinner } from "@/components/ui/fields";
import { getCustomerSession } from "@/lib/customer";

export const metadata = { title: "Finalizar compra · IQONIC WELLNESS", robots: { index: false } };

/** Adonde vuelve el cliente después de ingresar o registrarse. */
const LOGIN_URL = "/ingresar?next=/pago";

/**
 * /pago — Checkout. Requiere sesión: sin ella, redirige a ingresar y vuelve aquí.
 * El carrito vive en localStorage, así que se conserva durante el login.
 * La sesión se lee dentro de <Suspense> (requisito de Cache Components).
 */
export default function CheckoutPage() {
  return (
    <>
      <Navbar defaultActive="" />
      <main className="mx-auto min-h-screen max-w-6xl px-4 pb-20 pt-28 sm:px-6 md:pt-32 lg:px-8">
        <Suspense
          fallback={
            <p className="flex items-center gap-3 text-sm text-zinc-500">
              <Spinner className="h-5 w-5" /> Cargando…
            </p>
          }
        >
          <CheckoutGate />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

async function CheckoutGate() {
  const session = await getCustomerSession();
  if (session.status === "anonymous") redirect(LOGIN_URL);

  // Sin Supabase (desarrollo) no hay login posible: se muestra igual, vacío
  if (session.status === "unconfigured") return <CheckoutForm defaults={{ name: "", phone: "", email: "" }} />;

  const { profile, email } = session;
  return (
    <CheckoutForm
      defaults={{
        name: [profile?.first_name, profile?.last_name].filter(Boolean).join(" "),
        phone: profile?.phone ?? "",
        email: profile?.email ?? email ?? "",
      }}
    />
  );
}
