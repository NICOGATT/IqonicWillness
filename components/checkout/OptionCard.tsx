import type { ReactNode } from "react";

interface OptionCardProps {
  name: string;
  value: string;
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  description: string;
  /** Etiqueta junto al título (moneda, "Próximamente"…). */
  tag?: ReactNode;
}

/**
 * Opción tipo tarjeta sobre un <input type="radio"> real:
 * flechas del teclado, foco y lectores de pantalla funcionan solos.
 */
export function OptionCard({ name, value, checked, disabled, onSelect, icon, title, description, tag }: OptionCardProps) {
  return (
    <label
      className={`group relative flex gap-3.5 rounded-2xl border p-4 transition ${
        disabled
          ? "cursor-not-allowed border-white/[.05] bg-white/[.015] opacity-55"
          : checked
            ? "cursor-pointer border-brand-violet/60 bg-brand-violet/[.08] shadow-[0_0_0_1px_rgb(157_92_255/0.25)]"
            : "cursor-pointer border-white/[.08] bg-white/[.025] hover:border-white/20 hover:bg-white/[.04]"
      } has-focus-visible:ring-2 has-focus-visible:ring-brand-violet/50`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
        className="sr-only"
      />
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition ${
          checked ? "bg-brand-violet/20 text-brand-violet-light" : "bg-white/5 text-zinc-400"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold text-white">{title}</span>
          {tag}
        </span>
        <span className="mt-0.5 block text-sm leading-snug text-zinc-400">{description}</span>
      </span>
      <span
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition ${
          checked ? "border-brand-violet" : "border-white/20"
        }`}
        aria-hidden="true"
      >
        <span className={`h-2.5 w-2.5 rounded-full bg-brand-violet transition ${checked ? "scale-100" : "scale-0"}`} />
      </span>
    </label>
  );
}

export function Tag({ tone = "neutral", children }: { tone?: "neutral" | "soon"; children: ReactNode }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
        tone === "soon" ? "bg-brand-gold/15 text-brand-gold" : "bg-white/[.07] text-zinc-400"
      }`}
    >
      {children}
    </span>
  );
}
