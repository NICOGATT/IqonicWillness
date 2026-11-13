import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

/** Botón cuadrado solo con el ícono: consulta directa sin pasar por el carrito. */
export function WhatsAppIconLink({ message, label, className = "" }: { message: string; label: string; className?: string }) {
  return (
    <a
      href={buildWhatsAppUrl(message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title="Consultar por WhatsApp"
      className={`grid w-[52px] shrink-0 place-items-center rounded-2xl border border-wa/30 bg-wa/10 text-wa transition-colors hover:bg-wa hover:text-ink-950 ${className}`}
    >
      <WhatsAppIcon className="h-5 w-5" />
    </a>
  );
}
