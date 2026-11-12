import type { CSSProperties } from "react";

import { ProductArt } from "@/components/product/ProductArt";
import { Reveal } from "@/components/ui/Reveal";
import { WhatsAppButton } from "@/components/whatsapp/WhatsAppButton";
import type { Product } from "@/types/product";

/** Posiciones de la composición flotante (izquierda, centro, derecha). */
const slots = [
  { className: "left-[0%] bottom-[10%] z-10 h-[52%] w-[38%]", rotate: "-9deg", delay: "0s" },
  { className: "left-1/2 top-[4%] z-20 h-[78%] w-[56%] -translate-x-1/2", rotate: "0deg", delay: ".6s" },
  { className: "right-[0%] bottom-[12%] z-10 h-[52%] w-[38%]", rotate: "8deg", delay: "1.2s" },
];

export function Hero({ featured, totalProducts }: { featured: Product[]; totalProducts: number }) {
  const stats = [
    { label: "Fórmulas", value: String(totalProducts) },
    { label: "Minerales traza", value: "25" },
    { label: "Pedido", value: "1 clic" },
  ];

  // El producto más llamativo (pouch) al centro
  const center = featured.find((p) => p.packaging.shape === "pouch") ?? featured[0];
  const sides = featured.filter((p) => p !== center).slice(0, 2);
  const composition = [sides[0], center, sides[1]].filter(Boolean) as Product[];

  return (
    <section id="inicio" className="relative isolate scroll-mt-20 overflow-hidden pb-16 pt-28 md:pb-24 md:pt-36">
      <div className="grid-bg absolute inset-0 -z-10" aria-hidden="true" />

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:px-8">
        {/* Texto */}
        <Reveal className="text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-4 py-1.5 text-xs font-medium tracking-wide text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-gold shadow-[0_0_10px_2px_rgba(255,201,60,.6)]" />
            Wellness &amp; Performance · Línea diaria
          </span>

          <h1 className="mt-6 font-display text-[2.6rem] font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-[4.2rem]">
            Energía, enfoque y bienestar <span className="text-gradient">todos los días.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg lg:mx-0">
            Suplementos de alto rendimiento formulados para acompañar tu ritmo: gomitas de bienestar, energía con
            fórmula de hidrógeno e hidratación con 25 minerales traza.{" "}
            <span className="text-zinc-200">Pide en segundos por WhatsApp.</span>
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4 lg:justify-start">
            <WhatsAppButton size="lg" className="w-full sm:w-auto">
              Pedir por WhatsApp
            </WhatsAppButton>
            <a
              href="#productos"
              className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-2xl border border-white/12 bg-white/[.04] px-7 py-4 text-base font-semibold text-white transition hover:border-white/20 hover:bg-white/[.08] sm:w-auto"
            >
              Ver productos
            </a>
          </div>

          <dl className="mx-auto mt-12 grid max-w-lg grid-cols-3 gap-3 sm:gap-6 lg:mx-0">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/[.07] bg-white/[.025] px-3 py-4">
                <dt className="text-[11px] uppercase tracking-wider text-zinc-500 sm:text-xs">{s.label}</dt>
                <dd className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">{s.value}</dd>
              </div>
            ))}
          </dl>
        </Reveal>

        {/* Composición de productos */}
        <Reveal className="relative mx-auto h-[360px] w-full max-w-[560px] sm:h-[460px] lg:h-[540px]">
          <div aria-hidden="true">
            <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-violet/30 blur-[90px] sm:h-96 sm:w-96" />
            <div className="absolute bottom-[18%] left-[8%] h-40 w-40 rounded-full bg-brand-orange/30 blur-[70px]" />
            <div className="absolute bottom-[22%] right-[6%] h-40 w-40 rounded-full bg-brand-gold/25 blur-[70px]" />
          </div>
          {composition.map((product, i) => (
            <div key={product.id} className={`absolute ${slots[i].className}`}>
              <div
                className="h-full w-full animate-float drop-shadow-[0_30px_40px_rgba(0,0,0,.6)]"
                style={{ "--r": slots[i].rotate, animationDelay: slots[i].delay } as CSSProperties}
              >
                <ProductArt product={product} uid={`${product.id}-hero`} priority />
              </div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
