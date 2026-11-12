"use client";

import { useActionState } from "react";

import { signIn, type ActionState } from "@/app/admin/actions";
import { Field, inputClass, Spinner } from "@/components/ui/fields";

const initialState: ActionState = { status: "idle" };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.message && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {state.message}
        </p>
      )}

      <Field label="Correo" htmlFor="email" error={errors.email}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClass}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          placeholder="admin@tudominio.com"
        />
      </Field>

      <Field label="Contraseña" htmlFor="password" error={errors.password}>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : undefined}
        />
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-ink-950 transition hover:bg-zinc-200 disabled:opacity-60"
      >
        {pending && <Spinner />}
        {pending ? "Entrando…" : "Entrar al panel"}
      </button>
    </form>
  );
}
