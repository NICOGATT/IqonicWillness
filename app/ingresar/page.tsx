import Link from "next/link";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata = { title: "Ingresar · IQONIC WELLNESS" };

export default function SignInPage() {
  return (
    <AuthShell
      title="Bienvenido de nuevo"
      subtitle="Ingresa con tu correo y contraseña."
      footer={
        <>
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="font-semibold text-white hover:underline">Regístrate</Link>
        </>
      }
    >
      {/* El formulario lee ?next= y ?error= de la URL: va dentro de Suspense */}
      <Suspense>
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}
