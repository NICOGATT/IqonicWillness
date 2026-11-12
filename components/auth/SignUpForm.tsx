"use client";

import { signUpCustomer } from "@/app/auth/actions";
import { fieldProps, FormMessage, PasswordInput, SubmitButton } from "@/components/auth/AuthUI";
import { useFormAction } from "@/components/auth/useFormAction";
import { Field, inputClass } from "@/components/ui/fields";

export function SignUpForm() {
  const { state, onSubmit, pending, errors } = useFormAction(signUpCustomer);

  // Registro completado: ocultamos el formulario y mostramos el aviso del correo
  if (state.status === "success") {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-wa/10 text-wa">
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 6h16v12H4z" />
            <path d="M4 7l8 6 8-6" />
          </svg>
        </div>
        <p className="text-sm leading-relaxed text-zinc-300" role="status">{state.message}</p>
        <p className="text-xs text-zinc-500">¿No llega? Revisa la carpeta de spam o promociones.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormMessage status={state.status} message={state.message} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" htmlFor="first_name" error={errors.first_name}>
          <input {...fieldProps("first_name", errors)} autoComplete="given-name" className={inputClass} />
        </Field>
        <Field label="Apellido" htmlFor="last_name" error={errors.last_name}>
          <input {...fieldProps("last_name", errors)} autoComplete="family-name" className={inputClass} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Teléfono" htmlFor="phone" error={errors.phone} hint="Con código de país, ej. +52…">
          <input {...fieldProps("phone", errors)} type="tel" autoComplete="tel" inputMode="tel" className={inputClass} placeholder="+52 55 1234 5678" />
        </Field>
        <Field label="Fecha de nacimiento" htmlFor="birth_date" error={errors.birth_date}>
          <input {...fieldProps("birth_date", errors)} type="date" autoComplete="bday" min="1900-01-01" className={`${inputClass} [color-scheme:dark]`} />
        </Field>
      </div>

      <Field label="Correo" htmlFor="email" error={errors.email}>
        <input {...fieldProps("email", errors)} type="email" autoComplete="email" className={inputClass} placeholder="tu@correo.com" />
      </Field>

      <Field label="Contraseña" htmlFor="password" error={errors.password} hint="Mínimo 8 caracteres, con letras y números">
        <PasswordInput {...fieldProps("password", errors)} autoComplete="new-password" />
      </Field>
      <Field label="Repite la contraseña" htmlFor="password_confirm" error={errors.password_confirm}>
        <PasswordInput {...fieldProps("password_confirm", errors)} autoComplete="new-password" />
      </Field>

      <div className="pt-2">
        <SubmitButton pending={pending} pendingText="Creando cuenta…">Crear cuenta</SubmitButton>
      </div>
      <p className="text-center text-xs leading-relaxed text-zinc-600">
        Tu contraseña se guarda cifrada. Usamos tus datos solo para gestionar tus pedidos.
      </p>
    </form>
  );
}
