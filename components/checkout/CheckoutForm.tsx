"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";

import { CardCvcElement, CardExpiryElement, CardNumberElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

import { completeCardPayment, startCardPayment } from "@/app/pago/actions";
import { createReferralOrderAndGetWhatsAppUrl } from "@/app/referidos/actions";
import { CardPreview } from "@/components/checkout/CardPreview";
import { CheckoutSuccess } from "@/components/checkout/CheckoutSuccess";
import { DeliveryIcon, LockIcon, PaymentIcon } from "@/components/checkout/CheckoutIcons";
import { OptionCard, Tag } from "@/components/checkout/OptionCard";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import {
  EMPTY_STRIPE_CARD,
  StripeCardFields,
  type StripeCardState,
  type StripeFieldName,
} from "@/components/checkout/StripeCardFields";
import { CartIcon } from "@/components/icons/CartIcon";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { Field, inputClass, Spinner } from "@/components/ui/fields";
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
const CHECKOUT_FIELDS: CheckoutField[] = ["name", "phone", "email", "address", "city"];
type CardField = StripeFieldName | "holder";
const CARD_FIELDS: CardField[] = ["number", "holder", "expiry", "cvc"];

const CARD_INCOMPLETE: Record<StripeFieldName, string> = {
  number: "Completa el número de la tarjeta",
  expiry: "Completa el vencimiento",
  cvc: "Completa el código de seguridad",
};

/** Stripe.js se carga una sola vez, solo si hay clave publicable. */
const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

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
 * - Tarjeta: campos de Stripe con vista previa. El servidor crea el pedido y
 *   el cobro (app/pago/actions.ts); la tarjeta va directo a Stripe.
 * - Pedir por WhatsApp: registra el pedido y abre el chat con todos los datos.
 */
export function CheckoutForm(props: { defaults: CheckoutDefaults }) {
  return (
    <Elements
      stripe={stripePromise}
      options={{ locale: "es", fonts: [{ cssSrc: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap" }] }}
    >
      <CheckoutFormContent {...props} />
    </Elements>
  );
}

type Placed = { orderNumber: number | null; whatsappUrl: string; method: PaymentMethod; paid?: boolean };

/** Pedido + cobro ya creados: si la tarjeta se rechaza, se reintenta sobre el mismo. */
type PaymentSession = { clientSecret: string; orderNumber: number; key: string };

function CheckoutFormContent({ defaults }: { defaults: CheckoutDefaults }) {
  const items = useCartItems();
  const hydrated = useHydrated();
  const stripe = useStripe();
  const elements = useElements();

  const [form, setForm] = useState<CheckoutData>({
    ...defaults,
    delivery: "shipping",
    address: "",
    city: "",
    paymentMethod: "card",
  });
  const [holder, setHolder] = useState("");
  const [card, setCard] = useState<StripeCardState>(EMPTY_STRIPE_CARD);
  const [cvcFocused, setCvcFocused] = useState(false);
  const [note, setNote] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<Placed | null>(null);
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null);

  const { total, hasUnpriced } = getCartTotals(items);
  // Con productos "a consultar" no hay un total que cobrar, y sin Stripe configurado no hay cobro: solo WhatsApp
  const cardLive = getPaymentMethod("card").live;
  const cardBlocked = hasUnpriced || !cardLive;
  const data: CheckoutData = { ...form, paymentMethod: cardBlocked ? "whatsapp" : form.paymentMethod };
  const method = getPaymentMethod(data.paymentMethod);
  const payingByCard = method.id === "card";

  const errors = showErrors ? getCheckoutErrors(data) : {};
  const cardErrors = payingByCard ? getCardErrors(card, holder, showErrors) : {};

  function update<K extends keyof CheckoutData>(key: K, value: CheckoutData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  }

  function focusCardField(field: CardField) {
    if (field === "holder") return document.getElementById("card-holder")?.focus();
    const element = { number: CardNumberElement, expiry: CardExpiryElement, cvc: CardCvcElement }[field];
    elements?.getElement(element)?.focus();
  }

  /** Pago con tarjeta: crea (o reutiliza) el pedido y confirma el cobro con Stripe. */
  async function payWithCard() {
    const cardElement = elements?.getElement(CardNumberElement);
    if (!stripe || !cardElement) {
      setError("El formulario de pago todavía está cargando. Espera un segundo y vuelve a intentar.");
      return;
    }

    setPending(true);
    try {
      const request = { items: items.map((i) => ({ kind: i.kind, id: i.id, quantity: i.quantity })), note, checkout: data };
      const key = JSON.stringify(request);
      let session = paymentSession?.key === key ? paymentSession : null;
      if (!session) {
        const started = await startCardPayment(request);
        if (!started.ok) {
          setError(started.error);
          return;
        }
        session = { clientSecret: started.clientSecret, orderNumber: started.orderNumber, key };
        setPaymentSession(session);
      }

      // Stripe abre el 3D Secure si el banco lo pide
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(session.clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: { name: holder.trim(), email: data.email?.trim() || undefined, phone: data.phone.trim() },
        },
      });

      // Reintento de un pago que ya se había aprobado
      const intent = paymentIntent ?? (stripeError?.payment_intent?.status === "succeeded" ? stripeError.payment_intent : null);
      if (intent?.status !== "succeeded") {
        setError(stripeError?.message ?? "El pago no se completó. Prueba de nuevo o con otra tarjeta.");
        return;
      }

      // Registra el pago en el pedido (el webhook también lo hace por si se cierra la pestaña)
      const completed = await completeCardPayment(intent.id);
      if (!completed.ok) console.warn("[pago] Cobro aprobado, pero no se registró en el pedido:", completed.error);

      setPlaced({
        orderNumber: session.orderNumber,
        whatsappUrl: buildWhatsAppUrl(
          `Hola, acabo de pagar el pedido #${session.orderNumber} con tarjeta y quiero coordinar la entrega.`,
        ),
        method,
        paid: true,
      });
      setPaymentSession(null);
      clearCart();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("[pago] Error al pagar con tarjeta:", err);
      setError("No se pudo procesar el pago. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);

    const fieldErrors = getCheckoutErrors(data);
    const allCardErrors = payingByCard ? getCardErrors(card, holder, true) : {};
    const firstField = CHECKOUT_FIELDS.find((f) => fieldErrors[f]);
    const firstCardField = CARD_FIELDS.find((f) => allCardErrors[f]);
    if (firstField || firstCardField) {
      setShowErrors(true);
      if (firstField) document.getElementById(`checkout-${firstField}`)?.focus();
      else if (firstCardField) focusCardField(firstCardField);
      return;
    }

    if (payingByCard) {
      await payWithCard();
      return;
    }

    // Abre la pestaña dentro del clic para que el navegador no la bloquee
    setPending(true);
    const tab = window.open("", "_blank");
    const fallbackMessage = getCartMessage(items, note, {
      contactName: data.name.trim(),
      details: getCheckoutMessageLines(data),
    });
    const fallbackUrl = buildWhatsAppUrl(fallbackMessage);

    let url: string | null = fallbackUrl;
    try {
      // Atribuye el pedido al distribuidor de la cookie iqonic_ref y usa su WhatsApp
      const result = await createReferralOrderAndGetWhatsAppUrl({
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
        // Mismo destinatario que el pedido registrado: el distribuidor del enlace, si lo hay
        url = buildWhatsAppUrl(fallbackMessage, result.fallbackPhone);
        setPlaced({ orderNumber: null, whatsappUrl: url, method });
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
                const reason = hasUnpriced ? "No disponible: hay productos con precio a consultar." : "Disponible muy pronto.";
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
                    description={disabled ? reason : m.description}
                    tag={disabled ? hasUnpriced ? <Tag>No disponible</Tag> : <Tag tone="soon">Pronto</Tag> : undefined}
                  />
                );
              })}
            </div>

            {payingByCard ? (
              <div className="mt-6 rounded-2xl border border-white/[.07] bg-black/20 p-4 sm:p-6">
                <CardPreview
                  brand={card.brand}
                  holder={holder}
                  numberComplete={card.number.complete}
                  expiryComplete={card.expiry.complete}
                  cvcComplete={card.cvc.complete}
                  flipped={cvcFocused}
                />

                <div className="mt-6">
                  <StripeCardFields
                    errors={cardErrors}
                    disabled={pending}
                    onChange={(field, state, brand) => {
                      setCard((c) => ({ ...c, [field]: state, brand: brand ?? c.brand }));
                      setError(null);
                    }}
                    onCvcFocusChange={setCvcFocused}
                    holderField={
                      <Field label="Nombre del titular" htmlFor="card-holder" error={cardErrors.holder}>
                        <input
                          id="card-holder"
                          value={holder}
                          onChange={(e) => {
                            setHolder(e.target.value.replace(/[^\p{L}\s'.-]/gu, ""));
                            setError(null);
                          }}
                          autoComplete="cc-name"
                          maxLength={26}
                          placeholder="Como figura en la tarjeta"
                          aria-invalid={Boolean(cardErrors.holder)}
                          aria-describedby={cardErrors.holder ? "card-holder-error" : undefined}
                          className={`${inputClass} uppercase placeholder:normal-case`}
                        />
                      </Field>
                    }
                  />
                </div>

                <p className="mt-5 flex items-center gap-2 text-xs text-zinc-500">
                  <LockIcon className="h-4 w-4 shrink-0 text-zinc-400" />
                  Pago procesado por Stripe. Los datos de tu tarjeta no pasan por nuestros servidores.
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
              disabled={pending}
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-brand-orange to-brand-violet px-5 py-3.5 text-[15px] font-bold text-white shadow-[0_12px_40px_-12px_rgb(157_92_255/0.7)] transition hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-70"
            >
              {pending ? <Spinner className="h-5 w-5" /> : <LockIcon className="h-5 w-5" />}
              {pending ? "Procesando pago…" : `Pagar ${formatPrice(total)}`}
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

/**
 * Errores de la tarjeta. Stripe valida mientras se escribe ("número inválido");
 * los campos incompletos solo se marcan al intentar pagar.
 */
function getCardErrors(card: StripeCardState, holder: string, showIncomplete: boolean): Partial<Record<CardField, string>> {
  const errors: Partial<Record<CardField, string>> = {};
  for (const field of ["number", "expiry", "cvc"] as const) {
    const state = card[field];
    if (state.error) errors[field] = state.error;
    else if (showIncomplete && !state.complete) errors[field] = CARD_INCOMPLETE[field];
  }
  if (showIncomplete && holder.trim().length < 3) errors.holder = "Escribe el nombre como figura en la tarjeta";
  return errors;
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
