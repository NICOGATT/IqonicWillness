"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";

import { inputClass, Spinner } from "@/components/ui/fields";

/** Botón principal de los formularios de cuenta. */
export function SubmitButton({ pending, children, pendingText }: { pending: boolean; children: ReactNode; pendingText: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-orange to-brand-violet px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-violet/20 transition hover:brightness-110 disabled:opacity-60"
    >
      {pending && <Spinner />}
      {pending ? pendingText : children}
    </button>
  );
}

/** Mensaje de error o de éxito. */
export function FormMessage({ status, message }: { status: "idle" | "success" | "error"; message?: string }) {
  if (!message || status === "idle") return null;
  const ok = status === "success";
  return (
    <p
      role={ok ? "status" : "alert"}
      className={`rounded-xl border px-4 py-3 text-sm ${
        ok ? "border-wa/30 bg-wa/10 text-wa" : "border-red-500/30 bg-red-500/10 text-red-300"
      }`}
    >
      {message}
    </p>
  );
}

/** Campo de contraseña con botón para mostrar/ocultar. */
export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={`${inputClass} pr-12`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center text-zinc-500 transition hover:text-white"
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={visible}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {visible ? (
            <>
              <path d="M3 3l18 18" />
              <path d="M10.6 5.1A10 10 0 0122 12a17 17 0 01-2.5 3.3M6.6 6.6A17 17 0 002 12s3.6 7 10 7a9.6 9.6 0 004.4-1" />
              <path d="M9.9 9.9a3 3 0 004.2 4.2" />
            </>
          ) : (
            <>
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
              <circle cx="12" cy="12" r="3" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}

/** Props de accesibilidad para un campo con posible error. */
export function fieldProps(name: string, errors: Record<string, string>) {
  return {
    id: name,
    name,
    "aria-invalid": Boolean(errors[name]),
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  };
}
