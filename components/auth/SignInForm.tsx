"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { signInCustomer } from "@/app/auth/actions";
import { fieldProps, FormMessage, PasswordInput, SubmitButton } from "@/components/auth/AuthUI";
import { useFormAction } from "@/components/auth/useFormAction";
import { Field, inputClass } from "@/components/ui/fields";

const linkErrors: Record<string, string> = {
  enlace:
    "El enlace caducó o ya se usó. Si acababas de confirmar tu correo, inicia sesión normalmente; si no, pide uno nuevo.",
};

export function SignInForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/cuenta";
  const linkError = linkErrors[params.get("error") ?? ""];
  const { state, onSubmit, pending, errors } = useFormAction(signInCustomer);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {state.status === "idle" && linkError && <FormMessage status="error" message={linkError} />}
      <FormMessage status={state.status} message={state.message} />

      <Field label="Correo" htmlFor="email" error={errors.email}>
        <input {...fieldProps("email", errors)} type="email" autoComplete="email" className={inputClass} placeholder="tu@correo.com" />
      </Field>

      <Field label="Contraseña" htmlFor="password" error={errors.password}>
        <PasswordInput {...fieldProps("password", errors)} autoComplete="current-password" />
      </Field>

      <div className="flex justify-end">
        <Link href="/recuperar" className="text-xs font-semibold text-zinc-400 transition hover:text-white">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      <SubmitButton pending={pending} pendingText="Ingresando…">Ingresar</SubmitButton>
    </form>
  );
}
