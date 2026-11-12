import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { siteConfig } from "@/config/site";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

/** Botón circular fijo en la esquina inferior derecha. */
export function FloatingWhatsApp() {
  return (
    <a
      href={buildWhatsAppUrl(siteConfig.generalMessage)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribir por WhatsApp"
      className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-wa text-ink-950 shadow-[0_12px_40px_-8px_rgba(37,211,102,.7)] transition hover:scale-105"
    >
      <span className="absolute inset-0 animate-ping-soft rounded-full bg-wa" aria-hidden="true" />
      <WhatsAppIcon className="relative h-7 w-7" />
    </a>
  );
}
