import type { ReactNode } from "react";

import type { DeliveryMethodId, PaymentMethodId } from "@/lib/checkout";

/** Íconos de trazo (24×24) para medios de pago y entrega. */
function Stroke({ className = "h-5 w-5", children }: { className?: string; children: ReactNode }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const PAYMENT_PATHS: Record<PaymentMethodId, ReactNode> = {
  card: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10h19M6.5 15h3" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M20 11.5a8 8 0 01-11.6 7.1L4 20l1.4-4.2A8 8 0 1120 11.5z" />
      <path d="M9 10.5h6M9 13.5h4" />
    </>
  ),
};

const DELIVERY_PATHS: Record<DeliveryMethodId, ReactNode> = {
  shipping: (
    <>
      <path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3v3h-7" />
      <circle cx="6.5" cy="17.5" r="1.8" />
      <circle cx="16.5" cy="17.5" r="1.8" />
    </>
  ),
  coordinate: (
    <>
      <path d="M20 11.5a8 8 0 01-11.6 7.1L4 20l1.4-4.2A8 8 0 1120 11.5z" />
      <path d="M9 10.5h6M9 13.5h4" />
    </>
  ),
};

export function PaymentIcon({ id, className }: { id: PaymentMethodId; className?: string }) {
  return <Stroke className={className}>{PAYMENT_PATHS[id]}</Stroke>;
}

export function DeliveryIcon({ id, className }: { id: DeliveryMethodId; className?: string }) {
  return <Stroke className={className}>{DELIVERY_PATHS[id]}</Stroke>;
}

export function LockIcon({ className }: { className?: string }) {
  return (
    <Stroke className={className}>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V8a4 4 0 018 0v2.5" />
    </Stroke>
  );
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}
