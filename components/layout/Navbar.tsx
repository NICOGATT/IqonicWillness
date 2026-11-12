"use client";

import { useEffect, useState } from "react";

import { AccountLink } from "@/components/layout/AccountLink";
import { Logo } from "@/components/ui/Logo";
import { WhatsAppButton } from "@/components/whatsapp/WhatsAppButton";
import { siteConfig } from "@/config/site";

/**
 * Barra de navegación fija:
 * - Fondo con blur al hacer scroll.
 * - Resalta la sección visible.
 * - Menú desplegable en móvil.
 */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>(siteConfig.nav[0].id);

  // Estado "scrolled"
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Cierra el menú móvil al pasar a desktop
  useEffect(() => {
    const onResize = () => window.innerWidth >= 768 && setOpen(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Sección activa
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => entry.isIntersecting && setActiveId(entry.target.id));
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    siteConfig.nav.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const solid = scrolled || open;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b backdrop-blur-xl transition-colors duration-300 ${
        solid ? "border-white/[.07] bg-ink-950/80" : "border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 md:h-20 lg:px-8" aria-label="Principal">
        <Logo />

        <ul className="hidden items-center gap-8 text-sm font-medium text-zinc-400 md:flex">
          {siteConfig.nav.map((item) => (
            <li key={item.id}>
              <a
                href={item.href}
                aria-current={activeId === item.id ? "true" : undefined}
                className={`nav-link transition-colors hover:text-white ${activeId === item.id ? "text-white" : ""}`}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 lg:gap-4">
          <div className="hidden md:block">
            <AccountLink className="text-zinc-300" />
          </div>
          <div className="hidden sm:block">
            <WhatsAppButton size="sm">Hablar por WhatsApp</WhatsAppButton>
          </div>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-white md:hidden"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </nav>

      {/* Menú móvil */}
      {open && (
        <div id="mobile-menu" className="border-t border-white/5 bg-ink-950/95 md:hidden">
          <ul className="flex flex-col gap-1 px-4 py-4 text-base font-medium">
            {siteConfig.nav.map((item) => (
              <li key={item.id}>
                <a href={item.href} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 hover:bg-white/5">
                  {item.label}
                </a>
              </li>
            ))}
            <li>
              <AccountLink className="w-full rounded-xl px-4 py-3 text-base text-zinc-200 hover:bg-white/5" onNavigate={() => setOpen(false)} />
            </li>
            <li className="pt-2">
              <WhatsAppButton fullWidth>Hablar por WhatsApp</WhatsAppButton>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
