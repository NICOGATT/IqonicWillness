import type { ReactNode } from "react";

/** Clases compartidas de los campos del panel. */
export const inputClass =
  "w-full rounded-xl border border-white/10 bg-ink-950/60 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none transition focus:border-brand-violet/60 focus:ring-2 focus:ring-brand-violet/25 aria-[invalid=true]:border-red-500/60";

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}

/** Etiqueta + control + mensaje de error/ayuda. */
export function Field({ label, htmlFor, error, hint, className = "", children }: FieldProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-xs text-red-400">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-zinc-600">{hint}</p>
      ) : null}
    </div>
  );
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
