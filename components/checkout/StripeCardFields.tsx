"use client";

import { CardCvcElement, CardExpiryElement, CardNumberElement } from "@stripe/react-stripe-js";
import type { StripeElementChangeEvent, StripeElementStyle } from "@stripe/stripe-js";
import type { ReactNode } from "react";

import { inputClass } from "@/components/ui/fields";
import { toCardBrand, type CardBrand } from "@/lib/card";

/**
 * Campos de tarjeta de Stripe (iframes): el número, la fecha y el código
 * viajan directo a Stripe. Hacia afuera solo informan si están completos,
 * el error de validación y la marca.
 */

export type StripeFieldName = "number" | "expiry" | "cvc";

export interface StripeFieldState {
  complete: boolean;
  /** Error que da Stripe mientras se escribe ("El número no es válido"). */
  error?: string;
}

export interface StripeCardState {
  brand: CardBrand;
  number: StripeFieldState;
  expiry: StripeFieldState;
  cvc: StripeFieldState;
}

export const EMPTY_STRIPE_CARD: StripeCardState = {
  brand: "unknown",
  number: { complete: false },
  expiry: { complete: false },
  cvc: { complete: false },
};

/** Estilo dentro del iframe: replica inputClass (texto 14px, blanco, placeholder zinc-600). */
const ELEMENT_STYLE: StripeElementStyle = {
  base: {
    color: "#ffffff",
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: "14px",
    lineHeight: "20px",
    fontSmoothing: "antialiased",
    "::placeholder": { color: "#52525b" },
  },
  invalid: { color: "#fca5a5" },
};

/** El borde y el foco los ponemos nosotros: Stripe agrega StripeElement--focus / --invalid al contenedor. */
const elementClass = `${inputClass} [&.StripeElement--focus]:border-brand-violet/60 [&.StripeElement--focus]:ring-2 [&.StripeElement--focus]:ring-brand-violet/25`;
const invalidClass = "border-red-500/60";

interface StripeCardFieldsProps {
  errors: Partial<Record<StripeFieldName, string>>;
  disabled?: boolean;
  onChange: (field: StripeFieldName, state: StripeFieldState, brand?: CardBrand) => void;
  onCvcFocusChange: (focused: boolean) => void;
  /** Campo del titular (es nuestro: va entre el número y la fecha). */
  holderField: ReactNode;
}

export function StripeCardFields({ errors, disabled, onChange, onCvcFocusChange, holderField }: StripeCardFieldsProps) {
  const report = (field: StripeFieldName) => (event: StripeElementChangeEvent & { brand?: string }) =>
    onChange(field, { complete: event.complete, error: event.error?.message }, field === "number" ? toCardBrand(event.brand) : undefined);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <StripeField label="Número de tarjeta" id="card-number" error={errors.number} className="sm:col-span-2">
        <CardNumberElement
          id="card-number"
          className={`${elementClass} ${errors.number ? invalidClass : ""}`}
          options={{ style: ELEMENT_STYLE, placeholder: "1234 1234 1234 1234", disabled }}
          onChange={report("number")}
        />
      </StripeField>

      <div className="sm:col-span-2">{holderField}</div>

      <StripeField label="Vencimiento" id="card-expiry" error={errors.expiry}>
        <CardExpiryElement
          id="card-expiry"
          className={`${elementClass} ${errors.expiry ? invalidClass : ""}`}
          options={{ style: ELEMENT_STYLE, placeholder: "MM / AA", disabled }}
          onChange={report("expiry")}
        />
      </StripeField>

      <StripeField label="Código de seguridad" id="card-cvc" error={errors.cvc}>
        <CardCvcElement
          id="card-cvc"
          className={`${elementClass} ${errors.cvc ? invalidClass : ""}`}
          options={{ style: ELEMENT_STYLE, placeholder: "CVC", disabled }}
          onChange={report("cvc")}
          onFocus={() => onCvcFocusChange(true)}
          onBlur={() => onCvcFocusChange(false)}
        />
      </StripeField>
    </div>
  );
}

/** Como Field, pero el label no puede apuntar a un input dentro de un iframe. */
function StripeField({
  label,
  id,
  error,
  className = "",
  children,
}: {
  label: string;
  id: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <p id={`${id}-label`} className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </p>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
