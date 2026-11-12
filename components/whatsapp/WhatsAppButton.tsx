import type { ReactNode } from "react";

import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { siteConfig } from "@/config/site";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

type Variant = "primary" | "accent" | "outline";
type Size = "sm" | "md" | "lg";

interface WhatsAppButtonProps {
  /** Mensaje prellenado. Si se omite, se usa el mensaje general del sitio. */
  message?: string;
  variant?: Variant;
  size?: Size;
  /** Ocupa todo el ancho (útil en tarjetas y en móvil). */
  fullWidth?: boolean;
  className?: string;
  ariaLabel?: string;
  children?: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  // Verde WhatsApp
  primary: "btn-wa text-ink-950",
  // Usa el color de acento del contenedor (--accent / --accent-2), p. ej. una ProductCard
  accent: "btn-accent",
  outline: "border border-wa/30 bg-wa/10 text-wa hover:bg-wa hover:text-ink-950 transition-colors",
};

const sizeClasses: Record<Size, string> = {
  sm: "gap-2 rounded-full px-5 py-2.5 text-sm",
  md: "gap-2.5 rounded-2xl px-5 py-3.5 text-[15px]",
  lg: "gap-3 rounded-2xl px-7 py-4 text-base",
};

const iconSize: Record<Size, string> = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-6 w-6" };

/**
 * Enlace a WhatsApp con mensaje prellenado.
 * Es un <a> normal (no window.open) para que no lo bloqueen los navegadores
 * y funcione aunque JavaScript aún no haya cargado.
 */
export function WhatsAppButton({
  message = siteConfig.generalMessage,
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  ariaLabel,
  children = "Pedir por WhatsApp",
}: WhatsAppButtonProps) {
  return (
    <a
      href={buildWhatsAppUrl(message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className={[
        "inline-flex items-center justify-center whitespace-nowrap font-bold",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
    >
      <WhatsAppIcon className={iconSize[size]} />
      {children}
    </a>
  );
}
