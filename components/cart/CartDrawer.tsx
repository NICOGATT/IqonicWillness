"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";

import { createReferralOrderAndGetWhatsAppUrl } from "@/app/referidos/actions";
import { CartIcon } from "@/components/icons/CartIcon";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { Spinner } from "@/components/ui/fields";
import { setBuyer, useBuyer } from "@/lib/buyer-store";
import { getCartMessage, getCartTotals, getItemCount, MAX_QUANTITY, type CartItem } from "@/lib/cart";
import { clearCart, removeFromCart, setCartOpen, setQuantity, useCartItems, useCartOpen } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import { useActiveReferral } from "@/lib/use-active-referral";
import { useSignedIn } from "@/lib/use-signed-in";
import { normalizeWhatsApp } from "@/lib/validation/referral";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

const buyerInputClass =
  "mt-1.5 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-white/30 focus:outline-none aria-[invalid=true]:border-red-500/60";

/**
 * Panel lateral del carrito (<dialog> nativo: atrapa el foco y cierra con Esc).
 * "Pedir por WhatsApp" arma un mensaje con todo el pedido y abre wa.me.
 */
export function CartDrawer() {
  const items = useCartItems();
  const open = useCartOpen();
  const signedIn = useSignedIn();
  const ref = useRef<HTMLDialogElement>(null);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const buyer = useBuyer();
  const [buyerErrors, setBuyerErrors] = useState<{ nombre?: string; telefono?: string }>({});
  // Distribuidor del enlace (cookie iqonic_ref): a quién le llega el pedido
  const referral = useActiveReferral();
  // Pedido recién registrado: se muestra la confirmación en lugar del carrito vacío
  const [placed, setPlaced] = useState<{ orderNumber: number; whatsappUrl: string } | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const count = getItemCount(items);
  const { total, hasUnpriced } = getCartTotals(items);
  // Respaldo: mensaje armado en el navegador (si falla Supabase o sin JavaScript)
  const buyerName = buyer.nombre.trim();
  const fallbackMessage = getCartMessage(items, note, { contactName: buyerName || null });
  const fallbackUrl = buildWhatsAppUrl(fallbackMessage);

  /** Nombre obligatorio y teléfono opcional (mismas reglas que referralOrderSchema). */
  function validateBuyer(): boolean {
    const errors: typeof buyerErrors = {};
    if (buyerName.length < 2) errors.nombre = "Escribe tu nombre para enviar el pedido.";
    const phone = buyer.telefono.trim();
    if (phone && !/^[0-9]{7,15}$/.test(normalizeWhatsApp(phone))) errors.telefono = "Teléfono inválido.";
    setBuyerErrors(errors);
    const firstInvalid = errors.nombre ? "buyer-name" : errors.telefono ? "buyer-phone" : null;
    if (firstInvalid) document.getElementById(firstInvalid)?.focus();
    return !firstInvalid;
  }

  /**
   * 1. Abre la pestaña YA (dentro del clic) para que el navegador no la bloquee.
   * 2. Registra el pedido en Supabase (atribuido al distribuidor de la cookie
   *    iqonic_ref) y obtiene el mensaje con el número (#1042).
   * 3. Lleva esa pestaña al WhatsApp del distribuidor o de la tienda.
   */
  async function placeOrder(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    // Antes de abrir la pestaña: sin nombre no sale el pedido
    if (!validateBuyer()) return;
    setPending(true);
    const tab = window.open("", "_blank");

    let url: string | null = fallbackUrl;
    try {
      const result = await createReferralOrderAndGetWhatsAppUrl({
        items: items.map((i) => ({ kind: i.kind, id: i.id, quantity: i.quantity })),
        note,
        cliente: { nombre: buyerName, telefono: buyer.telefono.trim() || undefined },
      });
      if (result.ok) {
        url = result.whatsappUrl;
        setPlaced({ orderNumber: result.orderNumber, whatsappUrl: result.whatsappUrl });
        clearCart();
        setNote("");
      } else if (result.reason !== "failed") {
        url = null;
        setError(result.error);
      } else {
        console.warn("[carrito] Pedido no registrado, se envía igual por WhatsApp:", result.error);
        // Mismo destinatario que el pedido registrado: el distribuidor del enlace, si lo hay
        url = buildWhatsAppUrl(fallbackMessage, result.fallbackPhone);
      }
    } catch (err) {
      console.warn("[carrito] Pedido no registrado, se envía igual por WhatsApp:", err);
    } finally {
      setPending(false);
    }

    if (!url) {
      tab?.close();
      return;
    }
    if (tab) {
      tab.opener = null;
      tab.location.href = url;
    } else {
      // Ventanas emergentes bloqueadas: vamos a WhatsApp (externo) en esta misma pestaña
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = url;
    }
  }

  function handleClose() {
    setCartOpen(false);
    setPlaced(null);
    setError(null);
  }

  return (
    <dialog
      ref={ref}
      onClose={handleClose}
      // Clic en el fondo oscuro = cerrar
      onClick={(e) => e.target === ref.current && setCartOpen(false)}
      aria-labelledby="cart-title"
      className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-md animate-drawer-in border-l border-white/10 bg-ink-900 p-0 text-zinc-300 shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-white/[.07] px-5 py-4 sm:px-6">
          <div>
            <h2 id="cart-title" className="font-display text-lg font-bold text-white">Tu carrito</h2>
            <p className="text-sm text-zinc-500">
              {count === 0 ? "Sin productos" : `${count} ${count === 1 ? "unidad" : "unidades"}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-zinc-400 transition hover:bg-white/5 hover:text-white"
            aria-label="Cerrar carrito"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        {placed && items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-wa/15 text-wa">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            <p className="mt-5 font-display text-xl font-bold text-white">Pedido #{placed.orderNumber} registrado</p>
            <p className="mt-2 text-sm text-zinc-400">
              Envía el mensaje en WhatsApp para confirmarlo. Te respondemos con disponibilidad y entrega.
            </p>
            <a
              href={placed.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-wa mt-6 inline-flex items-center justify-center gap-2.5 rounded-2xl px-5 py-3 text-sm font-bold text-ink-950"
            >
              <WhatsAppIcon className="h-5 w-5" />
              ¿No se abrió? Abrir WhatsApp
            </a>
            <button
              type="button"
              onClick={handleClose}
              className="mt-3 text-sm font-semibold text-zinc-400 transition hover:text-white"
            >
              Seguir comprando
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/5 text-zinc-400">
              <CartIcon className="h-8 w-8" />
            </span>
            <p className="mt-5 font-display text-lg font-bold text-white">Tu carrito está vacío</p>
            <p className="mt-1 text-sm text-zinc-500">Agrega productos o paquetes y envíanos el pedido por WhatsApp.</p>
            <Link
              href="/#productos"
              onClick={() => setCartOpen(false)}
              className="mt-6 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/40"
            >
              Ver productos
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-white/[.06] overflow-y-auto px-5 sm:px-6">
              {items.map((item) => (
                <CartLine key={item.key} item={item} />
              ))}
            </ul>

            <footer className="border-t border-white/[.07] px-5 py-5 sm:px-6">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="buyer-name" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Tu nombre <span className="text-brand-orange">*</span>
                  </label>
                  <input
                    id="buyer-name"
                    value={buyer.nombre}
                    onChange={(e) => {
                      setBuyer({ nombre: e.target.value });
                      setBuyerErrors((errs) => ({ ...errs, nombre: undefined }));
                    }}
                    maxLength={120}
                    autoComplete="name"
                    placeholder="Nombre y apellido"
                    required
                    aria-invalid={Boolean(buyerErrors.nombre)}
                    aria-describedby={buyerErrors.nombre ? "buyer-name-error" : undefined}
                    className={buyerInputClass}
                  />
                </div>
                <div>
                  <label htmlFor="buyer-phone" className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Teléfono <span className="font-normal normal-case tracking-normal">(opcional)</span>
                  </label>
                  <input
                    id="buyer-phone"
                    value={buyer.telefono}
                    onChange={(e) => {
                      setBuyer({ telefono: e.target.value });
                      setBuyerErrors((errs) => ({ ...errs, telefono: undefined }));
                    }}
                    type="tel"
                    inputMode="tel"
                    maxLength={30}
                    autoComplete="tel"
                    placeholder="+54 9 11…"
                    aria-invalid={Boolean(buyerErrors.telefono)}
                    aria-describedby={buyerErrors.telefono ? "buyer-phone-error" : undefined}
                    className={buyerInputClass}
                  />
                </div>
                {(buyerErrors.nombre || buyerErrors.telefono) && (
                  <p role="alert" className="col-span-2 -mt-1 text-xs text-red-400">
                    <span id="buyer-name-error">{buyerErrors.nombre}</span>{" "}
                    <span id="buyer-phone-error">{buyerErrors.telefono}</span>
                  </p>
                )}
              </div>

              <label htmlFor="cart-note" className="mt-3 block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Comentario (opcional)
              </label>
              <textarea
                id="cart-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={300}
                rows={2}
                placeholder="Ej.: zona de entrega, horario, forma de pago…"
                className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-white/30 focus:outline-none"
              />

              <div className="mt-4 flex items-end justify-between gap-3">
                <div className="text-sm leading-tight">
                  <p className="text-zinc-400">{hasUnpriced ? "Total estimado" : "Total"}</p>
                  {hasUnpriced && <p className="mt-0.5 text-xs text-zinc-500">+ productos con precio a consultar</p>}
                </div>
                <p className="font-display text-2xl font-bold text-white">{formatPrice(total)}</p>
              </div>

              {error && (
                <p role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-200">
                  {error}
                </p>
              )}

              <Link
                // Sin sesión: primero ingresar, y después vuelve al checkout
                href={signedIn === false ? "/ingresar?next=/pago" : "/pago"}
                onClick={() => setCartOpen(false)}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-orange to-brand-violet px-5 py-3.5 text-[15px] font-bold text-white shadow-[0_12px_40px_-12px_rgb(157_92_255/0.7)] transition hover:-translate-y-0.5"
              >
                {signedIn === false ? "Ingresar para pagar" : "Continuar al pago"}
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
              <a
                href={fallbackUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={placeOrder}
                aria-disabled={pending}
                className={`mt-2.5 inline-flex w-full items-center justify-center gap-2.5 rounded-2xl border border-wa/40 px-5 py-3 text-sm font-bold text-wa transition hover:border-wa hover:bg-wa/10 ${
                  pending ? "pointer-events-none opacity-70" : ""
                }`}
              >
                {pending ? <Spinner /> : <WhatsAppIcon className="h-5 w-5" />}
                {pending ? "Registrando pedido…" : "Finalizar pedido por WhatsApp"}
              </a>
              <p className="mt-2 text-center text-xs text-zinc-500">
                {referral ? (
                  <>
                    Tu pedido por WhatsApp lo atiende <span className="font-semibold text-zinc-300">{referral.nombre_mostrar}</span>.
                  </>
                ) : signedIn === false ? (
                  "Para pagar necesitas tu cuenta: tu carrito se guarda mientras ingresas."
                ) : (
                  "Paga con tarjeta o envíanos el pedido tal cual por WhatsApp."
                )}
              </p>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm("¿Vaciar el carrito?")) {
                    clearCart();
                    setNote("");
                  }
                }}
                className="mx-auto mt-3 block text-xs font-semibold text-zinc-500 underline-offset-4 transition hover:text-zinc-300 hover:underline"
              >
                Vaciar carrito
              </button>
            </footer>
          </>
        )}
      </div>
    </dialog>
  );
}

function CartLine({ item }: { item: CartItem }) {
  return (
    <li className="flex gap-3 py-4">
      <span
        className="mt-1 h-10 w-10 shrink-0 rounded-xl"
        style={{ background: `linear-gradient(135deg, ${item.accent}, ${item.accent}55)` }}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              {item.kind === "package" ? "Paquete" : "Producto"}
            </p>
            <Link
              href={item.href}
              onClick={() => setCartOpen(false)}
              className="block truncate font-semibold text-white underline-offset-4 hover:underline"
            >
              {item.name}
            </Link>
            {item.detail && (
              <p className={`text-sm text-zinc-400 ${item.kind === "package" ? "line-clamp-2" : "truncate"}`}>{item.detail}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => removeFromCart(item.key)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-zinc-500 transition hover:bg-white/5 hover:text-white"
            aria-label={`Quitar ${item.name} del carrito`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
            </svg>
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-center rounded-xl border border-white/10 bg-black/30" role="group" aria-label={`Cantidad de ${item.name}`}>
            <StepButton label="Restar uno" onClick={() => setQuantity(item.key, item.quantity - 1)}>
              <path d="M5 12h14" />
            </StepButton>
            <span className="w-8 text-center text-sm font-semibold tabular-nums text-white" aria-live="polite">
              {item.quantity}
            </span>
            <StepButton
              label="Sumar uno"
              disabled={item.quantity >= MAX_QUANTITY}
              onClick={() => setQuantity(item.key, item.quantity + 1)}
            >
              <path d="M12 5v14M5 12h14" />
            </StepButton>
          </div>
          <p className="text-right text-sm leading-tight">
            {item.price === null ? (
              <span className="text-zinc-400">A consultar</span>
            ) : (
              <>
                <span className="font-semibold text-white">{formatPrice(item.price * item.quantity)}</span>
                {item.quantity > 1 && <span className="block text-xs text-zinc-500">{formatPrice(item.price)} c/u</span>}
              </>
            )}
          </p>
        </div>
      </div>
    </li>
  );
}

function StepButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid h-8 w-8 place-items-center text-zinc-300 transition hover:text-white disabled:opacity-30"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}
