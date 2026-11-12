import { Reveal } from "@/components/ui/Reveal";
import { WhatsAppButton } from "@/components/whatsapp/WhatsAppButton";

const steps = [
  { title: "Elige tu producto", text: "Explora el catálogo y toca “Pedir por WhatsApp”.", className: "bg-brand-orange/15 text-brand-orange" },
  { title: "Envía el mensaje", text: "Se abre WhatsApp con el producto y sabor ya escritos.", className: "bg-brand-violet/15 text-brand-violet-light" },
  { title: "Recibe y disfruta", text: "Confirmamos disponibilidad, pago y entrega contigo.", className: "bg-brand-gold/15 text-brand-gold" },
];

export function ContactCTA() {
  return (
    <section id="contacto" className="relative scroll-mt-20 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal className="relative overflow-hidden rounded-[2rem] border border-white/[.08] bg-gradient-to-br from-ink-800 via-ink-900 to-ink-950 px-6 py-14 sm:px-12 md:py-20">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand-orange/20 blur-[90px]" aria-hidden="true" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-brand-violet/25 blur-[90px]" aria-hidden="true" />

          <div className="relative grid items-center gap-12 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-wa">Contacto directo</p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">¿Listo para empezar?</h2>
              <p className="mx-auto mt-4 max-w-md text-zinc-400 lg:mx-0">
                Escríbenos y te ayudamos a elegir la fórmula ideal para tu objetivo. Sin formularios ni esperas.
              </p>
              <WhatsAppButton size="lg" className="mt-8 w-full sm:w-auto">
                Escribir por WhatsApp
              </WhatsAppButton>
            </div>

            <ol className="grid gap-4">
              {steps.map((step, i) => (
                <li key={step.title} className="flex gap-4 rounded-2xl border border-white/[.07] bg-white/[.03] p-5">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-display font-bold ${step.className}`}>
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-white">{step.title}</p>
                    <p className="text-sm text-zinc-400">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
