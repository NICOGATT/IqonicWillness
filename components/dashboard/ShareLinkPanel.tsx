"use client";

import { ShareLinkCard } from "@/components/referrals/ShareLinkCard";
import { Toast, useToast } from "@/components/ui/Toast";

/** ShareLinkCard con sus propios avisos, para usarla desde Server Components. */
export function ShareLinkPanel({
  siteUrl,
  slug,
  name,
  hasStore = true,
}: {
  siteUrl: string;
  /** Slug de la tienda o iqonic_id (lo que va en ?ref=). */
  slug: string;
  name: string;
  hasStore?: boolean;
}) {
  const { toast, show, dismiss } = useToast();
  return (
    <>
      <ShareLinkCard siteUrl={siteUrl} slug={slug} name={name} notify={show} hasStore={hasStore} />
      <Toast toast={toast} onDismiss={dismiss} />
    </>
  );
}
