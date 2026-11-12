import type { ReactNode } from "react";

import type { BenefitIconName } from "@/types/product";

/** Trazos SVG (24×24) para cada beneficio. */
const paths: Record<BenefitIconName, ReactNode> = {
  pill: (<><path d="M10.5 3.5a5 5 0 017 7l-7 7a5 5 0 01-7-7l7-7z" /><path d="M7 10l7 7" /></>),
  shield: (<><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" /><path d="M9 12l2 2 4-4" /></>),
  sun: (<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>),
  leaf: (<><path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15" /><path d="M5 19l7-7" /></>),
  bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />,
  target: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>),
  trend: (<><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></>),
  refresh: (<><path d="M20 11a8 8 0 10-2.3 5.7" /><path d="M20 4v7h-7" /></>),
  heart: <path d="M12 20s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.5-7 10-7 10z" />,
  wave: (<><path d="M2 9c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-3 5 0" /><path d="M2 15c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-3 5 0" /></>),
  balance: (<><path d="M12 3v18M7 21h10M5 7h14" /><path d="M5 7l-3 6a3 3 0 006 0L5 7zM19 7l-3 6a3 3 0 006 0l-3-6z" /></>),
  wind: (<><path d="M3 8h10a3 3 0 10-3-3" /><path d="M3 12h15a3 3 0 11-3 3" /><path d="M3 16h7" /></>),
  drop: <path d="M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z" />,
  pulse: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  gem: (<><path d="M12 2l9 5v10l-9 5-9-5V7l9-5z" /><path d="M12 22V12M3 7l9 5 9-5" /></>),
  trophy: (<><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4z" /><path d="M7 6H4a3 3 0 003 3M17 6h3a3 3 0 01-3 3" /></>),
};

export function BenefitIcon({ name, className = "h-4 w-4" }: { name: BenefitIconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {paths[name]}
    </svg>
  );
}
