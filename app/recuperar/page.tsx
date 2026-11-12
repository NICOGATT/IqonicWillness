import Link from "next/link";

import { AuthShell } from "@/components/auth/AuthShell";
import { ResetRequestForm } from "@/components/auth/PasswordForms";

export const metadata = { title: "Recuperar contraseña · IQONIC WELLNESS" };

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Recuperar contraseña"
      subtitle="Te enviaremos un enlace para crear una nueva."
      footer={<Link href="/ingresar" className="font-semibold text-white hover:underline">Volver a ingresar</Link>}
    >
      <ResetRequestForm />
    </AuthShell>
  );
}
