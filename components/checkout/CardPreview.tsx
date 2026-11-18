import type { CSSProperties } from "react";

import { BRAND_LABEL, cvcLength, maskedCardGroups, type CardBrand } from "@/lib/card";

/** Cara de la tarjeta: oculta cuando queda de espaldas al girar. */
const FACE: CSSProperties = { backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" };

const BRAND_BG: Record<CardBrand, string> = {
  visa: "linear-gradient(135deg, #1f2a6b 0%, #3b2fb0 55%, #7b4dff 100%)",
  mastercard: "linear-gradient(135deg, #2a1414 0%, #8a2a12 50%, #ff8a1f 100%)",
  amex: "linear-gradient(135deg, #0d3b46 0%, #137a83 55%, #3fc6c2 100%)",
  unknown: "linear-gradient(135deg, #1c1c25 0%, #3a2466 55%, #9d5cff 100%)",
};

interface CardPreviewProps {
  brand: CardBrand;
  holder: string;
  /** Cada campo de Stripe avisa si está completo (nunca su contenido). */
  numberComplete: boolean;
  expiryComplete: boolean;
  cvcComplete: boolean;
  flipped: boolean;
}

/**
 * Tarjeta dibujada que acompaña al formulario.
 * Los campos son de Stripe (iframes): sabemos la marca y si cada campo está
 * completo, nunca los números. El titular sí es un campo nuestro.
 * Solo es visual: aria-hidden, los lectores de pantalla leen los campos.
 */
export function CardPreview({ brand, holder, numberComplete, expiryComplete, cvcComplete, flipped }: CardPreviewProps) {
  const name = holder.trim().toUpperCase() || "NOMBRE Y APELLIDO";
  const done = "text-white";
  const empty = "text-white/45";

  return (
    <div className="mx-auto w-full max-w-[22rem]" style={{ perspective: "1200px" }} aria-hidden="true">
      <div
        className="relative aspect-[1.586] w-full transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none"
        style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "none" }}
      >
        {/* Frente */}
        <div
          className="absolute inset-0 flex flex-col justify-between overflow-hidden rounded-2xl p-5 text-white shadow-[0_30px_60px_-25px_rgb(0_0_0/0.9)] ring-1 ring-white/15 transition-[background] duration-500"
          style={{ ...FACE, background: BRAND_BG[brand] }}
        >
          <CardShine />
          <div className="relative flex items-start justify-between">
            <Chip />
            <BrandMark brand={brand} />
          </div>

          <p
            className={`relative flex justify-between gap-2 font-mono text-[clamp(1rem,5vw,1.35rem)] tracking-[0.12em] drop-shadow transition-colors ${numberComplete ? done : empty}`}
          >
            {maskedCardGroups(brand).map((group, i) => (
              <span key={i}>{group}</span>
            ))}
          </p>

          <div className="relative flex items-end justify-between gap-4 text-[11px]">
            <div className="min-w-0">
              <p className="uppercase tracking-wider text-white/55">Titular</p>
              <p className="mt-0.5 truncate font-semibold tracking-wider">{name}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="uppercase tracking-wider text-white/55">Vence</p>
              <p className={`mt-0.5 font-mono font-semibold tracking-wider ${expiryComplete ? done : empty}`}>
                {expiryComplete ? "••/••" : "MM/AA"}
              </p>
            </div>
          </div>
        </div>

        {/* Dorso */}
        <div
          className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl pt-6 text-white shadow-[0_30px_60px_-25px_rgb(0_0_0/0.9)] ring-1 ring-white/15"
          style={{ ...FACE, transform: "rotateY(180deg)", background: BRAND_BG[brand] }}
        >
          <div className="h-11 w-full bg-black/80" />
          <div className="mt-5 flex items-center gap-3 px-5">
            <div className="h-9 flex-1 rounded-md bg-[repeating-linear-gradient(-45deg,#f4f4f5_0_6px,#e4e4e7_6px_12px)]" />
            <div
              className={`rounded-md bg-white px-3 py-1.5 font-mono text-sm font-bold tracking-widest ${cvcComplete ? "text-ink-950" : "text-zinc-400"}`}
            >
              {"•".repeat(cvcLength(brand))}
            </div>
          </div>
          <p className="mt-2 px-5 text-right text-[10px] uppercase tracking-wider text-white/60">Código de seguridad</p>
          <div className="mt-auto flex justify-end p-5">
            <BrandMark brand={brand} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CardShine() {
  return (
    <span
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          "radial-gradient(120% 80% at 100% 0%, rgb(255 255 255 / 0.18), transparent 55%), radial-gradient(80% 60% at 0% 100%, rgb(0 0 0 / 0.25), transparent 60%)",
      }}
    />
  );
}

function Chip() {
  return (
    <svg className="h-9 w-12" viewBox="0 0 48 36" aria-hidden="true">
      <rect x="1" y="1" width="46" height="34" rx="6" fill="#e9c46a" stroke="#b8902f" />
      <path d="M1 12h14M1 24h14M33 12h14M33 24h14M15 1v34M33 1v34M15 18h18" stroke="#b8902f" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

/** Marca de la red (dibujo simplificado). */
function BrandMark({ brand }: { brand: CardBrand }) {
  if (brand === "mastercard") {
    return (
      <span className="flex items-center" title={BRAND_LABEL.mastercard}>
        <span className="h-8 w-8 rounded-full bg-[#eb001b]" />
        <span className="-ml-3.5 h-8 w-8 rounded-full bg-[#f79e1b] mix-blend-screen" />
      </span>
    );
  }
  if (brand === "visa") return <span className="font-display text-2xl font-extrabold italic tracking-tight">VISA</span>;
  if (brand === "amex")
    return <span className="rounded bg-white/90 px-1.5 py-0.5 text-[11px] font-extrabold tracking-wider text-[#137a83]">AMEX</span>;
  return (
    <svg className="h-7 w-7 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
      <path d="M8.5 7.5a6 6 0 010 9M12 5a9.5 9.5 0 010 14M15.5 3a13 13 0 010 18" />
    </svg>
  );
}
