import Link from "next/link";

export function Logo({ showMark = true, href = "#inicio" }: { showMark?: boolean; href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="IQONIC THRIVE, ir al inicio">
      {showMark && (
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-orange via-[#e2622b] to-brand-violet shadow-lg shadow-brand-violet/20">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-ink-950" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 4v16" />
            <path d="M5 13l7-7 7 7" />
          </svg>
        </span>
      )}
      <span className="font-display text-[15px] font-extrabold tracking-[0.18em] text-white sm:text-base">
        IQONIC<span className="text-gradient"> THRIVE</span>
      </span>
    </Link>
  );
}
