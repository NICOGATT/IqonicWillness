import Link from "next/link";

import { AuthShell } from "@/components/auth/AuthShell";
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
          <Link href="/ingresar" className="font-semibold text-white hover:underline">Ingresa</Link>
        </>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
