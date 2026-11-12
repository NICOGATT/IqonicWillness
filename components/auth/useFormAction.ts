"use client";

import { startTransition, useActionState, type FormEvent } from "react";

import type { FormState } from "@/app/auth/actions";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * useActionState + envío con onSubmit.
 * Evita que React vacíe el formulario cuando el servidor devuelve errores,
 * así el cliente no tiene que volver a escribir sus datos.
 */
export function useFormAction(action: Action) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" } as FormState);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  return { state, onSubmit, pending, errors: state.fieldErrors ?? {} };
}
