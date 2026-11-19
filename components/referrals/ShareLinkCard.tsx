"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { siteConfig } from "@/config/site";
import type { ToastTone } from "@/components/ui/Toast";
import { useSiteOrigin } from "@/lib/use-site-origin";

/**
 * Enlace de invitación: https://dominio/?ref=juan-perez (slug de la tienda) o
 * https://dominio/?ref=123456 (iqonic_id, si todavía no creó su tienda).
 * Lo procesa proxy.ts. Se usa ?ref= y no /<ref> porque un slug igual a una
 * ruta del sitio (creado antes de reservarla) nunca llegaría a app/[ref].
 */
export function buildReferralLink(siteUrl: string, ref: string): string {
  return `${siteUrl.replace(/\/$/, "")}/?ref=${encodeURIComponent(ref)}`;
}

function getShareText(name: string, hasStore: boolean) {
  return hasStore
    ? `¡Hola! Soy ${name}, asesor/a de ${siteConfig.name} 🌿 Mira los productos y haz tu pedido directo conmigo por WhatsApp:`
    : `¡Hola! Soy ${name}, distribuidor/a de ${siteConfig.name} 🌿 Crea tu cuenta con mi enlace y te acompaño en tus compras:`;
}

const noopSubscribe = () => () => {};

/** Menú nativo de compartir (móviles): solo existe en el navegador; false durante la hidratación. */
function useCanShareNatively(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator.share === "function",
    () => false,
  );
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Navegadores viejos o sin permisos (http, iframes): método clásico
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

/** Tarjeta con el enlace de invitación: copiar con un clic, compartir por WhatsApp (o nativo) y abrir. */
export function ShareLinkCard({
  siteUrl,
  slug,
  name,
  notify,
  hasStore = true,
}: {
  siteUrl: string;
  /** Lo que va en ?ref=: slug de la tienda o iqonic_id. */
  slug: string;
  name: string;
  notify: (tone: ToastTone, message: string) => void;
  /** false = distribuidor sin tienda: el enlace solo vincula registros (los pedidos van a la tienda principal). */
  hasStore?: boolean;
}) {
  // Dominio de la página abierta (siteUrl solo mientras se hidrata)
  const link = buildReferralLink(useSiteOrigin(siteUrl), slug);
  const [copied, setCopied] = useState(false);
  const canShareNatively = useCanShareNatively();

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2200);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const shareText = getShareText(name, hasStore);
  /** wa.me sin número: WhatsApp abre el selector de chats con el mensaje listo. */
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${link}`)}`;

  async function handleCopy() {
    if (await copyText(link)) setCopied(true);
    else notify("error", "No se pudo copiar. Mantén presionado el enlace para copiarlo.");
  }

  async function handleNativeShare() {
    try {
      await navigator.share({ title: `${name} · ${siteConfig.name}`, text: shareText, url: link });
    } catch (error) {
      // El usuario cerró el menú de compartir: no es un error
      if (error instanceof DOMException && error.name === "AbortError") return;
      notify("error", "No se pudo abrir el menú de compartir. Copia el enlace.");
    }
  }

  return (
    <section
      aria-labelledby="share-title"
      className="relative overflow-hidden rounded-3xl border border-white/[.08] bg-gradient-to-br from-brand-violet/[.12] via-white/[.02] to-brand-orange/[.08] p-6 sm:p-8"
    >
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-violet/20 blur-3xl" aria-hidden="true" />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-violet-light">Tu link de invitación</p>
        <h2 id="share-title" className="mt-2 font-display text-xl font-bold text-white sm:text-2xl">
          {hasStore ? "Comparte tu tienda" : "Invita a tus clientes"}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          {hasStore
            ? "Quien entre con este enlace verá tu nombre en la tienda, quedará registrado como tu cliente y sus pedidos llegarán a tu WhatsApp."
            : "Quien entre y cree su cuenta con este enlace quedará registrado como tu cliente."}
        </p>

        <div className="mt-5 flex flex-col gap-1.5 rounded-2xl border border-white/10 bg-ink-950/70 p-1.5 sm:flex-row sm:items-center sm:gap-2 sm:pl-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 px-2.5 sm:px-0">
            <svg className="h-4 w-4 shrink-0 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7" />
            </svg>
            <input
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Tu link de invitación"
              className="min-w-0 flex-1 bg-transparent py-2 text-sm font-medium text-white outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition sm:py-2 ${
              copied ? "bg-wa/15 text-wa" : "bg-white/10 text-white hover:bg-white/15"
            }`}
          >
            {copied ? (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="12" height="12" rx="2" />
                <path d="M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1" />
              </svg>
            )}
            <span aria-live="polite">{copied ? "¡Copiado!" : "Copiar mi link de invitación"}</span>
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <a
            href={whatsappShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-wa inline-flex flex-1 items-center justify-center gap-2.5 rounded-2xl px-5 py-3 text-sm font-bold text-ink-950"
          >
            <WhatsAppIcon className="h-5 w-5" />
            Compartir por WhatsApp
          </a>
          {canShareNatively && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/40"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M16 6l-4-4-4 4M12 2v13" />
              </svg>
              Más opciones
            </button>
          )}
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/40"
          >
            {hasStore ? "Ver mi tienda" : "Probar mi enlace"}
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
