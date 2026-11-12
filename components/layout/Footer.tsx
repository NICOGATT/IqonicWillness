import type { ReactNode } from "react";

import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { CurrentYear } from "@/components/ui/CurrentYear";
import { Logo } from "@/components/ui/Logo";
import { siteConfig } from "@/config/site";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

const legalLinks = [
  { href: "#", label: "Privacidad" },
  { href: "#", label: "Términos" },
];

function SocialLink({ href, label, children, className = "" }: { href: string; label: string; children: ReactNode; className?: string }) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      aria-label={label}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={`grid h-11 w-11 place-items-center rounded-xl border transition ${
        className || "border-white/10 bg-white/[.03] text-zinc-400 hover:border-white/25 hover:text-white"
      }`}
    >
      {children}
    </a>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/[.06] bg-ink-950">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <Logo showMark={false} />
            <p className="mt-4 max-w-xs text-sm text-zinc-500">
              Bienestar y rendimiento diario. Gomitas, energía e hidratación para tu mejor versión.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Enlaces</p>
            <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {[...siteConfig.nav, ...legalLinks].map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-zinc-500 transition-colors hover:text-white">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Síguenos</p>
            <div className="mt-4 flex gap-3">
              <SocialLink href={siteConfig.social.instagram} label="Instagram">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
              </SocialLink>
              <SocialLink href={siteConfig.social.facebook} label="Facebook">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5V21h3z" />
                </svg>
              </SocialLink>
              <SocialLink href={siteConfig.social.tiktok} label="TikTok">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M16.6 3c.4 2.3 1.9 3.9 4.1 4.1v3.1c-1.5.1-2.9-.4-4.1-1.2v6.2A6.2 6.2 0 1110.4 9v3.2a3 3 0 102.1 2.9V3h4.1z" />
                </svg>
              </SocialLink>
              <SocialLink
                href={buildWhatsAppUrl(siteConfig.generalMessage)}
                label="WhatsApp"
                className="border-wa/30 bg-wa/10 text-wa hover:bg-wa hover:text-ink-950"
              >
                <WhatsAppIcon className="h-5 w-5" />
              </SocialLink>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-white/[.06] pt-8 text-xs text-zinc-600">
          <p>
            Estos productos son suplementos dietéticos y no están destinados a diagnosticar, tratar, curar o prevenir
            ninguna enfermedad. Consulta a tu médico antes de consumirlos si estás embarazada, en lactancia, tomas
            medicamentos o tienes alguna condición de salud.
          </p>
          <p className="mt-4">
            © <CurrentYear /> {siteConfig.name}. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
