"use client";

import { ShareLinkCard } from "@/components/referrals/ShareLinkCard";
import { Toast, useToast } from "@/components/ui/Toast";

/** ShareLinkCard con sus propios avisos, para usarla desde Server Components. */
export function ShareLinkPanel({ siteUrl, slug, name }: { siteUrl: string; slug: string; name: string }) {
  const { toast, show, dismiss } = useToast();
  return (
    <>
      <ShareLinkCard siteUrl={siteUrl} slug={slug} name={name} notify={show} />
      <Toast toast={toast} onDismiss={dismiss} />
    </>
  );
}
