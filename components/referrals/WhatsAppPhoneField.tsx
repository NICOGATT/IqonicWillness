"use client";

import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { inputClass } from "@/components/ui/fields";
import { normalizeWhatsApp, WHATSAPP_REGEX } from "@/lib/validation/referral";
import {
  getCountry,
  getLocalNumberWarning,
  joinWhatsApp,
  OTHER_COUNTRY_ID,
  splitWhatsApp,
  WHATSAPP_COUNTRIES,
} from "@/lib/whatsapp-countries";

export type PhoneValue = { countryId: string; local: string };

/**
 * WhatsApp con selector de código de país.
 * Muestra en vivo el número final (+5491123456789) y un enlace para probarlo.
 */
export function WhatsAppPhoneField({
  value,
  onChange,
  error,
  label = "Número de WhatsApp",
  inputName = "whatsapp",
  previewText = "Tus clientes te escribirán a",
}: {
  value: PhoneValue;
  onChange: (value: PhoneValue) => void;
  error?: string;
  label?: string;
  /** name del campo visible (solo el número local). Cámbialo si el formulario manda el número completo en otro campo. */
  inputName?: string;
  /** Texto antes del número final: "Tus clientes te escribirán a +549…". */
  previewText?: string;
}) {
  const country = getCountry(value.countryId);
  const full = joinWhatsApp(value.countryId, value.local);
  const valid = WHATSAPP_REGEX.test(full);
  const warning = getLocalNumberWarning(value.countryId, value.local);

  function handleLocalChange(raw: string) {
    // Pegó o escribió el número internacional completo (+54 9 11…, 0054…): detectamos el país
    if (/^\s*(\+|00)/.test(raw) && normalizeWhatsApp(raw).length >= 10) {
      return onChange(splitWhatsApp(raw));
    }
    // Dígitos, espacios y guiones (y un "+" inicial mientras escribe el código de país)
    const local = raw.replace(/[^\d\s+-]/g, "").replace(/(?!^)\+/g, "").slice(0, 22);
    onChange({ ...value, local });
  }

  return (
    <div>
      <label htmlFor="whatsapp" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {label}
      </label>
      <div className="flex gap-2">
        {/* <select> nativo invisible encima de un botón con el código corto:
            la lista muestra "+54 9 Argentina" pero el campo solo "+54 9" */}
        <div className="relative w-[6.5rem] shrink-0">
          <select
            id="whatsapp-country"
            aria-label="Código de país"
            value={value.countryId}
            onChange={(e) => onChange({ countryId: e.target.value, local: value.local })}
            className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 [color-scheme:dark]"
          >
            {WHATSAPP_COUNTRIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.id === OTHER_COUNTRY_ID ? c.name : `${c.label} · ${c.name}`}
              </option>
            ))}
          </select>
          <span
            aria-hidden="true"
            className={`${inputClass} flex h-full items-center justify-between gap-1 font-semibold tabular-nums peer-hover:border-white/20 peer-focus-visible:border-brand-violet/60 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-violet/25`}
          >
            {country.id === OTHER_COUNTRY_ID ? "Otro" : country.label}
            <svg className="h-4 w-4 shrink-0 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </div>
        <input
          id="whatsapp"
          name={inputName}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={value.local}
          onChange={(e) => handleLocalChange(e.target.value)}
          placeholder={country.example}
          aria-invalid={Boolean(error)}
          aria-describedby="whatsapp-help"
          className={`${inputClass} min-w-0 flex-1 tabular-nums`}
        />
      </div>

      <div id="whatsapp-help" className="mt-1.5 space-y-1 text-xs">
        {error ? (
          <p className="text-red-400">{error}</p>
        ) : warning ? (
          <p className="text-brand-gold">{warning}</p>
        ) : (
          <p className="text-zinc-600">{country.hint}</p>
        )}
        {value.local.trim() && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-zinc-500">
            <span>
              {previewText}{" "}
              <span className={`font-semibold tabular-nums ${valid ? "text-white" : "text-zinc-400"}`}>+{full}</span>
            </span>
            {valid && (
              <a
                href={`https://wa.me/${full}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-wa underline-offset-4 hover:underline"
              >
                <WhatsAppIcon className="h-3.5 w-3.5" />
                Probar
              </a>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
