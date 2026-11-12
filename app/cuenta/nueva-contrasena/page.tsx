import { AuthShell } from "@/components/auth/AuthShell";
import { NewPasswordForm } from "@/components/auth/PasswordForms";

export const metadata = { title: "Nueva contraseña · IQONIC WELLNESS", robots: { index: false } };

/**
 * Se llega aquí desde "Cambiar contraseña" (con sesión) o desde el enlace
 * de recuperación del correo (que abre la sesión en /auth/callback).
 * proxy.ts redirige a /ingresar si no hay sesión.
 */
export default function NewPasswordPage() {
  return (
    <AuthShell title="Nueva contraseña" subtitle="Elige una contraseña que no uses en otros sitios.">
      <NewPasswordForm />
    </AuthShell>
  );
}
