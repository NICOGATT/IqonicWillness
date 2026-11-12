import type { ReactNode } from "react";

import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

interface Pillar {
  title: string;
  text: string;
  icon: ReactNode;
  iconClassName: string;
}

const pillars: Pillar[] = [
  {
    title: "Calidad Premium",
    text: "Ingredientes seleccionados, envases sellados y sabores que da gusto tomar todos los días: mango, durazno, limón y punch tropical.",
    iconClassName: "bg-brand-gold/10 ring-brand-gold/25 text-brand-gold",
    icon: (<><path d="M6 3h12l3 6-9 12L3 9l3-6z" /><path d="M3 9h18M12 21L8 9l4-6 4 6-4 12" /></>),
  },
  {
    title: "Fórmulas Avanzadas",
    text: "Fórmula de hidrógeno para energía, electrolitos con 25 minerales traza y gomitas con vitaminas esenciales. Cada producto con un propósito claro.",
    iconClassName: "bg-brand-violet/10 ring-brand-violet/30 text-brand-violet-light",
    icon: (<><path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 006 21h12a1.7 1.7 0 001.5-2.5L14 9V3" /><path d="M7 15h10" /></>),
  },
  {
    title: "Resultados Comprobados",
    text: "Rutinas simples que se sostienen: un stick o tus gomitas al día. La constancia es lo que se nota en tu energía, enfoque y bienestar.",
    iconClassName: "bg-brand-orange/10 ring-brand-orange/25 text-brand-orange",
    icon: (<><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></>),
  },
];

const commitments = [
  {
    title: "Producto original",
    text: "Envases sellados de fábrica",
    icon: (<><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></>),
  },
  {
    title: "Atención personalizada",
    text: "Te asesoramos por WhatsApp",
    icon: <path d="M21 12a8 8 0 01-11.8 7L4 20l1-4.6A8 8 0 1121 12z" />,
  },
  {
    title: "Pedido simple",
    text: "Coordinamos la entrega contigo",
    icon: (<><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="2" /><circle cx="17" cy="18" r="2" /></>),
  },
];

const Svg = ({ children, className }: { children: ReactNode; className: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

export function Benefits() {
  return (
    <section id="beneficios" className="relative scroll-mt-20 overflow-hidden py-20 md:py-28">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" aria-hidden="true" />
      <div className="absolute -right-40 top-20 h-96 w-96 rounded-full bg-brand-violet/10 blur-[110px]" aria-hidden="true" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Por qué IQONIC THRIVE"
          eyebrowClassName="text-brand-violet-light"
          title="Hecho para quienes exigen más"
          description="Tres pilares guían cada fórmula que llega a tus manos."
        />

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {pillars.map((pillar, i) => (
            <Reveal key={pillar.title} as="article" delay={i * 0.1} className="pillar relative rounded-3xl p-8">
              <span className="absolute right-7 top-7 font-display text-5xl font-extrabold text-white/[.05]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className={`grid h-14 w-14 place-items-center rounded-2xl ring-1 ${pillar.iconClassName}`}>
                <Svg className="h-7 w-7">{pillar.icon}</Svg>
              </div>
              <h3 className="mt-6 font-display text-xl font-bold text-white">{pillar.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{pillar.text}</p>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-10 grid gap-4 rounded-3xl border border-white/[.07] bg-white/[.02] p-6 sm:grid-cols-3 sm:p-8">
          {commitments.map((item) => (
            <div key={item.title} className="flex items-center gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/5 text-white">
                <Svg className="h-5 w-5">{item.icon}</Svg>
              </span>
              <p className="text-sm">
                <span className="block font-semibold text-white">{item.title}</span>
                {item.text}
              </p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
