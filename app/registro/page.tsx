import Link from "next/link";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { AuthSwitchLink } from "@/components/auth/AuthSwitchLink";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const metadata = { title: "Crear cuenta · IQONIC WELLNESS" };

export default function SignUpPage() {
  return (
    <AuthShell
      title="Crea tu cuenta"
      subtitle="Regístrate para pedir más rápido y seguir tus compras."
      footer={
        <>
          ¿Ya tienes cuenta?{" "}
          <Suspense fallback={<Link href="/ingresar" className="font-semibold text-white hover:underline">Ingresa</Link>}>
            <AuthSwitchLink href="/ingresar">Ingresa</AuthSwitchLink>
          </Suspense>
        </>
      }
    >
      {/* El formulario lee ?next= de la URL: va dentro de Suspense */}
      <Suspense>
        <SignUpForm />
      </Suspense>
    </AuthShell>
  );
}
