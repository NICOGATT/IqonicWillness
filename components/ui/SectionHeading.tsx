import { Reveal } from "@/components/ui/Reveal";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: React.ReactNode;
  /** Clase de color para el texto pequeño superior. */
  eyebrowClassName?: string;
}

export function SectionHeading({ eyebrow, title, description, eyebrowClassName = "text-brand-orange" }: SectionHeadingProps) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
      <p className={`text-xs font-semibold uppercase tracking-[0.25em] ${eyebrowClassName}`}>{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">{title}</h2>
      {description && <p className="mt-4 text-zinc-400">{description}</p>}
    </Reveal>
  );
}
