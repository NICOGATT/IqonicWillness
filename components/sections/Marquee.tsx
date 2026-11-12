const words = [
  "Energy Boost",
  "Immune Support",
  "Hydration",
  "Calm Focus",
  "Peak Endurance",
  "Antioxidant Defense",
  "25 Trace Minerals",
  "Fast Recovery",
];
const colors = ["#ff8a1f", "#9d5cff", "#ffc93c"];

/** Cinta animada de beneficios (el contenido se duplica para un bucle continuo). */
export function Marquee() {
  const row = (copy: number) =>
    words.map((word, i) => (
      <span key={`${copy}-${word}`} className="flex items-center gap-10">
        {word}
        <span style={{ color: colors[i % colors.length] }}>✦</span>
      </span>
    ));

  return (
    <div className="relative overflow-hidden border-y border-white/[.06] bg-white/[.015] py-5" aria-hidden="true">
      <div className="flex w-max animate-marquee gap-10 whitespace-nowrap font-display text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500 sm:text-base">
        {row(0)}
        {row(1)}
      </div>
    </div>
  );
}
