"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";

import { createWhatsAppOrder } from "@/app/pedidos/actions";
import { CardPreview } from "@/components/checkout/CardPreview";
import { CheckoutSuccess } from "@/components/checkout/CheckoutSuccess";
import { DeliveryIcon, LockIcon, PaymentIcon } from "@/components/checkout/CheckoutIcons";
import { OptionCard, Tag } from "@/components/checkout/OptionCard";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { CartIcon } from "@/components/icons/CartIcon";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { Field, inputClass, Spinner } from "@/components/ui/fields";
import {
  cvcLength,
  detectBrand,
  EMPTY_CARD,
  formatCardNumber,
  formatExpiry,
  validateCard,
  type CardErrors,
  type CardFields,
} from "@/lib/card";
import { getCartMessage, getCartTotals } from "@/lib/cart";
import { clearCart, useCartItems } from "@/lib/cart-store";
import {
  DELIVERY_METHODS,
  PAYMENT_METHODS,
  getCheckoutErrors,
  getCheckoutMessageLines,
  getPaymentMethod,
  type CheckoutData,
  type CheckoutField,
  type PaymentMethod,
} from "@/lib/checkout";
import { formatPrice } from "@/lib/format";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

/** Orden en que se enfoca el primer campo con error. */
const FIELD_IDS: string[] = [
  ...(["name", "phone", "email", "address", "city"] satisfies CheckoutField[]).map((f) => `checkout-${f}`),
  ...(["number", "holder", "expiry", "cvc"] satisfies (keyof CardFields)[]).map((f) => `card-${f}`),
];

/** true recién después de hidratar: el carrito vive en localStorage. */
const noopSubscribe = () => () => {};
function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export interface CheckoutDefaults {
  name: string;
  phone: string;
  email: string;
}

/**
 * /pago — Datos, entrega y forma de pago (solo con sesión iniciada).
 * - Tarjeta: formulario con vista previa en vivo. El cobro se conecta a
 *   Stripe más adelante (NEXT_PUBLIC_PAY_CARD=true).
 * - Pedir por WhatsApp: registra el pedido y abre el chat con todos los datos.
 */
export function CheckoutForm({ defaults }: { defaults: CheckoutDefaults }) {
  const items = useCartItems();
  const hydrated = useHydrated();

  const [form, setForm] = useState<CheckoutData>({
    ...defaults,
    delivery: "shipping",
    address: "",
    city: "",
    paymentMethod: "card",
  });
  const [card, setCard] = useState<CardFields>(EMPTY_CARD);
  const [cvcFocused, setCvcFocused] = useState(false);
  const [note, setNote] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<{ orderNumber: number | null; whatsappUrl: string; method: PaymentMethod } | null>(
    null,
  );

  const { total, hasUnpriced } = getCartTotals(items);
  // Con productos "a consultar" no hay un total que cobrar: solo WhatsApp
  const cardBlocked = hasUnpriced;
  const data: CheckoutData = { ...form, paymentMethod: cardBlocked ? "whatsapp" : form.paymentMethod };
  const method = getPaymentMethod(data.paymentMethod);
  const payingByCard = method.id === "card";

  const errors = showErrors ? getCheckoutErrors(data) : {};
  const cardErrors: CardErrors = showErrors && payingByCard ? validateCard(card) : {};
  const brand = detectBrand(card.number);

  function update<K extends keyof CheckoutData>(key: K, value: CheckoutData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  }

  function updateCard<K extends keyof CardFields>(key: K, value: CardFields[K]) {
    setCard((c) => ({ ...c, [key]: value }));
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);

    const fieldErrors = getCheckoutErrors(data);
    const allCardErrors = payingByCard ? validateCard(card) : {};
    const invalid = new Set([
      ...Object.keys(fieldErrors).map((f) => `checkout-${f}`),
      ...Object.keys(allCardErrors).map((f) => `card-${f}`),
    ]);
    const firstInvalid = FIELD_IDS.find((id) => invalid.has(id));
    if (firstInvalid) {
      setShowErrors(true);
      document.getElementById(firstInvalid)?.focus();
      return;
    }

    if (payingByCard) {
      // Aquí irá el cobro con Stripe. Los datos de la tarjeta no se envían a nuestro servidor.
      if (!method.live) {
        setError("El cobro con tarjeta se habilita muy pronto. Mientras tanto, puedes elegir «Pedir por WhatsApp».");
      }
      return;
    }

    // Abre la pestaña dentro del clic para que el navegador no la bloquee
    setPending(true);
    const tab = window.open("", "_blank");
    const fallbackUrl = buildWhatsAppUrl(
      getCartMessage(items, note, { contactName: data.name.trim(), details: getCheckoutMessageLines(data) }),
    );

    let url: string | null = fallbackUrl;
    try {
      const result = await createWhatsAppOrder({
        items: items.map((i) => ({ kind: i.kind, id: i.id, quantity: i.quantity })),
        note,
        checkout: data,
      });
      if (result.ok) {
        url = result.whatsappUrl;
        setPlaced({ orderNumber: result.orderNumber, whatsappUrl: result.whatsappUrl, method });
        clearCart();
      } else if (result.reason !== "failed") {
        url = null;
        setError(result.error);
      } else {
        console.warn("[pago] Pedido no registrado, se envía igual por WhatsApp:", result.error);
        setPlaced({ orderNumber: null, whatsappUrl: fallbackUrl, method });
      }
    } catch (err) {
      console.warn("[pago] Pedido no registrado, se envía igual por WhatsApp:", err);
      setPlaced({ orderNumber: null, whatsappUrl: fallbackUrl, method });
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
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = url;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (placed) return <CheckoutSuccess {...placed} />;

  if (!hydrated) {
    return (
      <p className="flex items-center gap-3 text-sm text-zinc-500">
        <Spinner className="h-5 w-5" /> Cargando tu carrito…
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/5 text-zinc-400">
          <CartIcon className="h-8 w-8" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold text-white">Tu carrito está vacío</h1>
        <p className="mt-2 text-sm text-zinc-500">Agrega productos o paquetes para continuar con el pago.</p>
        <Link
          href="/#productos"
          className="mt-6 inline-block rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/40"
        >
          Ver productos
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Steps />
      <h1 className="mt-6 font-display text-3xl font-bold text-white sm:text-4xl">Finalizar compra</h1>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8">
        <div className="space-y-6">
          {/* 1. Contacto */}
          <Section number={1} title="Tus datos">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre y apellido" htmlFor="checkout-name" error={errors.name} className="sm:col-span-2">
                <input
                  id="checkout-name"
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  autoComplete="name"
                  maxLength={120}
                  placeholder="Ana Pérez"
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "checkout-name-error" : undefined}
                  className={inputClass}
                />
              </Field>
              <Field label="Teléfono / WhatsApp" htmlFor="checkout-phone" error={errors.phone}>
                <input
                  id="checkout-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  autoComplete="tel"
                  inputMode="tel"
                  maxLength={30}
                  placeholder="+54 9 11 1234-5678"
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? "checkout-phone-error" : undefined}
                  className={inputClass}
                />
              </Field>
              <Field
                label={payingByCard ? "Email" : "Email (opcional)"}
                htmlFor="checkout-email"
                error={errors.email}
                hint={payingByCard ? "Te enviamos el comprobante de pago." : undefined}
              >
                <input
                  id="checkout-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  autoComplete="email"
                  maxLength={254}
                  placeholder="ana@correo.com"
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "checkout-email-error" : undefined}
                  className={inputClass}
                />
              </Field>
            </div>
          </Section>

          {/* 2. Entrega */}
          <Section number={2} title="Entrega">
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Forma de entrega">
              {DELIVERY_METHODS.map((d) => (
                <OptionCard
                  key={d.id}
                  name="delivery"
                  value={d.id}
                  checked={form.delivery === d.id}
                  onSelect={() => update("delivery", d.id)}
                  icon={<DeliveryIcon id={d.id} />}
                  title={d.label}
                  description={d.description}
                />
              ))}
            </div>
            {form.delivery === "shipping" && (
              <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
                <Field label="Dirección" htmlFor="checkout-address" error={errors.address}>
                  <input
                    id="checkout-address"
                    value={form.address}
                    onChange={(e) => update("address", e.target.value)}
                    autoComplete="street-address"
                    maxLength={160}
                    placeholder="Calle, número, piso / depto."
                    aria-invalid={Boolean(errors.address)}
                    aria-describedby={errors.address ? "checkout-address-error" : undefined}
                    className={inputClass}
                  />
                </Field>
                <Field label="Localidad o barrio" htmlFor="checkout-city" error={errors.city}>
                  <input
                    id="checkout-city"
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    autoComplete="address-level2"
                    maxLength={80}
                    placeholder="Palermo, CABA"
                    aria-invalid={Boolean(errors.city)}
                    aria-describedby={errors.city ? "checkout-city-error" : undefined}
                    className={inputClass}
                  />
                </Field>
              </div>
            )}
          </Section>

          {/* 3. Pago */}
          <Section number={3} title="Forma de pago">
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Forma de pago">
              {PAYMENT_METHODS.map((m) => {
                const disabled = m.id === "card" && cardBlocked;
                return (
                  <OptionCard
                    key={m.id}
                    name="payment"
                    value={m.id}
                    checked={data.paymentMethod === m.id}
                    disabled={disabled}
                    onSelect={() => update("paymentMethod", m.id)}
                    icon={m.id === "whatsapp" ? <WhatsAppIcon className="h-5 w-5" /> : <PaymentIcon id="card" />}
                    title={m.label}
                    description={disabled ? "No disponible: hay productos con precio a consultar." : m.description}
                    tag={disabled ? <Tag>No disponible</Tag> : undefined}
                  />
                );
              })}
            </div>

            {payingByCard ? (
              <div className="mt-6 rounded-2xl border border-white/[.07] bg-black/20 p-4 sm:p-6">
                <CardPreview card={card} flipped={cvcFocused} />

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Field label="Número de tarjeta" htmlFor="card-number" error={cardErrors.number} className="sm:col-span-2">
                    <input
                      id="card-number"
                      value={card.number}
                      onChange={(e) => updateCard("number", formatCardNumber(e.target.value))}
                      inputMode="numeric"
                      autoComplete="cc-number"
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      aria-invalid={Boolean(cardErrors.number)}
                      aria-describedby={cardErrors.number ? "card-number-error" : undefined}
                      className={`${inputClass} font-mono tracking-wider`}
                    />
                  </Field>
                  <Field label="Nombre del titular" htmlFor="card-holder" error={cardErrors.holder} className="sm:col-span-2">
                    <input
                      id="card-holder"
                      value={card.holder}
                      onChange={(e) => updateCard("holder", e.target.value.replace(/[^\p{L}\s'.-]/gu, ""))}
                      autoComplete="cc-name"
                      maxLength={26}
                      placeholder="Como figura en la tarjeta"
                      aria-invalid={Boolean(cardErrors.holder)}
                      aria-describedby={cardErrors.holder ? "card-holder-error" : undefined}
                      className={`${inputClass} uppercase placeholder:normal-case`}
                    />
                  </Field>
                  <Field label="Vencimiento" htmlFor="card-expiry" error={cardErrors.expiry}>
                    <input
                      id="card-expiry"
                      value={card.expiry}
                      onChange={(e) => {
                        // Al borrar la barra no se vuelve a agregar sola
                        const value = e.target.value;
                        updateCard("expiry", value.length < card.expiry.length ? value : formatExpiry(value));
                      }}
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      placeholder="MM/AA"
                      maxLength={5}
                      aria-invalid={Boolean(cardErrors.expiry)}
                      aria-describedby={cardErrors.expiry ? "card-expiry-error" : undefined}
                      className={`${inputClass} font-mono`}
                    />
                  </Field>
                  <Field label="Código de seguridad" htmlFor="card-cvc" error={cardErrors.cvc} hint={`${cvcLength(brand)} dígitos al dorso`}>
                    <input
                      id="card-cvc"
                      value={card.cvc}
                      onChange={(e) => updateCard("cvc", e.target.value.replace(/\D/g, "").slice(0, cvcLength(brand)))}
                      onFocus={() => setCvcFocused(true)}
                      onBlur={() => setCvcFocused(false)}
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      placeholder={"•".repeat(cvcLength(brand))}
                      aria-invalid={Boolean(cardErrors.cvc)}
                      aria-describedby={cardErrors.cvc ? "card-cvc-error" : undefined}
                      className={`${inputClass} font-mono`}
                    />
                  </Field>
                </div>

                <p className="mt-5 flex items-center gap-2 text-xs text-zinc-500">
                  <LockIcon className="h-4 w-4 shrink-0 text-zinc-400" />
                  Pago encriptado. No guardamos los datos de tu tarjeta.
                </p>
              </div>
            ) : (
              <p className="mt-4 flex gap-2.5 rounded-xl border border-white/[.06] bg-black/20 px-3.5 py-3 text-sm leading-relaxed text-zinc-400">
                <WhatsAppIcon className="mt-0.5 h-4 w-4 shrink-0 text-wa" />
                <span>
                  Al confirmar se abre WhatsApp con tu pedido, tus datos y la entrega. {method.nextStep}
                </span>
              </p>
            )}

            <div className="mt-5">
              <Field label="Comentario (opcional)" htmlFor="checkout-note">
                <textarea
                  id="checkout-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={300}
                  rows={2}
                  placeholder="Ej.: horario de entrega, referencias del domicilio…"
                  className={`${inputClass} resize-none`}
                />
              </Field>
            </div>
          </Section>
        </div>

        <OrderSummary items={items}>
          {error && (
            <p role="alert" className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3.5 py-2.5 text-sm text-amber-100">
              {error}
            </p>
          )}
          {showErrors && (Object.keys(errors).length > 0 || Object.keys(cardErrors).length > 0) && (
            <p role="alert" className="mb-4 text-sm text-red-400">
              Revisa los datos marcados en rojo.
            </p>
          )}
          {payingByCard ? (
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-brand-orange to-brand-violet px-5 py-3.5 text-[15px] font-bold text-white shadow-[0_12px_40px_-12px_rgb(157_92_255/0.7)] transition hover:-translate-y-0.5"
            >
              <LockIcon className="h-5 w-5" />
              Pagar {formatPrice(total)}
            </button>
          ) : (
            <button
              type="submit"
              disabled={pending}
              className="btn-wa inline-flex w-full items-center justify-center gap-2.5 rounded-2xl px-5 py-3.5 text-[15px] font-bold text-ink-950 disabled:pointer-events-none disabled:opacity-70"
            >
              {pending ? <Spinner className="h-5 w-5" /> : <WhatsAppIcon className="h-5 w-5" />}
              {pending ? "Registrando pedido…" : "Pedir por WhatsApp"}
            </button>
          )}
          <p className="mt-3 text-center text-xs leading-relaxed text-zinc-500">
            {payingByCard
              ? "Pago seguro. Te enviamos el comprobante a tu email."
              : "Se abre WhatsApp con tu pedido listo para enviar. Nada se cobra hasta que lo confirmemos."}
          </p>
        </OrderSummary>
      </div>
    </form>
  );
}

function Section({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  const id = `checkout-step-${number}`;
  return (
    <section aria-labelledby={id} className="rounded-3xl border border-white/[.07] bg-white/[.02] p-5 sm:p-6">
      <h2 id={id} className="mb-5 flex items-center gap-3 font-display text-lg font-bold text-white">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-brand-orange to-brand-violet text-sm text-white">
          {number}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Steps() {
  const steps = ["Carrito", "Datos y pago", "Confirmación"];
  return (
    <ol className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider sm:text-sm">
      {steps.map((step, i) => (
        <li key={step} className="flex items-center gap-2">
          <span className={i === 1 ? "text-white" : i === 0 ? "text-zinc-400" : "text-zinc-600"} aria-current={i === 1 ? "step" : undefined}>
            {step}
          </span>
          {i < steps.length - 1 && (
            <svg className="h-3.5 w-3.5 text-zinc-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 6l6 6-6 6" />
            </svg>
          )}
        </li>
      ))}
    </ol>
  );
}
