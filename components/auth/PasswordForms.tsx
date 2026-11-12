"use client";

import { requestPasswordReset, updatePassword } from "@/app/auth/actions";
import { fieldProps, FormMessage, PasswordInput, SubmitButton } from "@/components/auth/AuthUI";
import { useFormAction } from "@/components/auth/useFormAction";
import { Field, inputClass } from "@/components/ui/fields";

/** Paso 1: pedir el enlace de recuperación por correo. */
export function ResetRequestForm() {
  const { state, onSubmit, pending, errors } = useFormAction(requestPasswordReset);

  if (state.status === "success") {
    return <FormMessage status="success" message={state.message} />;
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormMessage status={state.status} message={state.message} />
      <Field label="Correo" htmlFor="email" error={errors.email}>
        <input {...fieldProps("email", errors)} type="email" autoComplete="email" className={inputClass} placeholder="tu@correo.com" />
      </Field>
      <SubmitButton pending={pending} pendingText="Enviando…">Enviar enlace</SubmitButton>
    </form>
  );
}

/** Paso 2: elegir la contraseña nueva (con la sesión que abre el enlace). */
export function NewPasswordForm() {
  const { state, onSubmit, pending, errors } = useFormAction(updatePassword);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormMessage status={state.status} message={state.message} />
      <Field label="Contraseña nueva" htmlFor="password" error={errors.password} hint="Mínimo 8 caracteres, con letras y números">
        <PasswordInput {...fieldProps("password", errors)} autoComplete="new-password" />
      </Field>
      <Field label="Repite la contraseña" htmlFor="password_confirm" error={errors.password_confirm}>
        <PasswordInput {...fieldProps("password_confirm", errors)} autoComplete="new-password" />
      </Field>
      <SubmitButton pending={pending} pendingText="Guardando…">Guardar contraseña</SubmitButton>
    </form>
  );
}
