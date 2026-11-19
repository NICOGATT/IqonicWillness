"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { checkIqonicIdAvailability, signUpCustomer, type IqonicIdCheck } from "@/app/auth/actions";
import { CheckoutNotice } from "@/components/auth/CheckoutNotice";
import { fieldProps, FormMessage, PasswordInput, SubmitButton } from "@/components/auth/AuthUI";
import { useFormAction } from "@/components/auth/useFormAction";
import { OptionCard } from "@/components/checkout/OptionCard";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { WhatsAppPhoneField, type PhoneValue } from "@/components/referrals/WhatsAppPhoneField";
import { Field, inputClass, Spinner } from "@/components/ui/fields";
import { siteConfig } from "@/config/site";
import { useReferralSponsor, type SponsorState } from "@/lib/use-referral-sponsor";
import { IQONIC_ID_REGEX, normalizeIqonicId, type SignUpRole } from "@/lib/validation/customer";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { DEFAULT_COUNTRY_ID, joinWhatsApp, splitWhatsApp } from "@/lib/whatsapp-countries";

/**
 * Registro condicional:
 *
 *   ¿Cómo quieres registrarte?  (obligatorio, sin opción preseleccionada)
 *   ├─ Cliente       → nombre completo, correo, WhatsApp (opcional), contraseña
 *   └─ Distribuidor  → ¿Ya tienes tu número de distribuidor?
 *      ├─ Sí → Iqonic ID (verificado en vivo) + WhatsApp obligatorio + datos de cuenta
 *      └─ No → sin botón de registro: tarjeta + WhatsApp a su patrocinador
 *
 * El patrocinador (cookie iqonic_sponsor) viaja oculto en referred_by_iqonic_id;
 * el servidor lo revalida (app/auth/actions.ts → resolveReferrerIqonicId).
 */

/** Dónde encuentra el distribuidor su número. Ajústalo si la oficina virtual lo muestra en otro lugar. */
const IQONIC_ID_HELP = "Es tu número de distribuidor: lo encuentras en tu oficina virtual de IQONIC, en los datos de tu perfil.";

/** Número que atiende a quien entra sin enlace de referido (mismo criterio que getDefaultWhatsApp()). */
const DEFAULT_WHATSAPP = (process.env.NEXT_PUBLIC_DEFAULT_WHATSAPP?.trim() || siteConfig.whatsappNumber).replace(/\D/g, "");

/* ------------------------------------------------------------------ */
/* Verificación en vivo del Iqonic ID                                   */
/* ------------------------------------------------------------------ */

type LiveCheck = { status: "idle" } | { status: "checking" } | IqonicIdCheck;

/**
 * Verifica el Iqonic ID 400 ms después de dejar de escribir, o al instante al
 * salir del campo. Solo es una ayuda: el servidor y el UNIQUE de la BD
 * validan de nuevo al enviar.
 */
function useIqonicIdCheck() {
  const [check, setCheck] = useState<LiveCheck>({ status: "idle" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef("");
  /** Último valor ya verificado (o en curso): evita repetir la consulta en el blur. */
  const checked = useRef("");

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function run(value: string) {
    checked.current = value;
    setCheck({ status: "checking" });
    const result = await checkIqonicIdAvailability(value).catch(
      (): IqonicIdCheck => ({ status: "error", message: "No pudimos verificar el número. Inténtalo de nuevo." }),
    );
    // Ignora respuestas viejas si siguió escribiendo
    if (latest.current === value) setCheck(result);
  }

  function schedule(raw: string, delay: number) {
    const value = normalizeIqonicId(raw);
    latest.current = value;
    if (timer.current) clearTimeout(timer.current);
    if (!IQONIC_ID_REGEX.test(value)) {
      checked.current = "";
      return setCheck({ status: "idle" });
    }
    if (delay === 0) {
      if (checked.current !== value) void run(value);
      return;
    }
    checked.current = "";
    setCheck({ status: "checking" });
    timer.current = setTimeout(() => void run(value), delay);
  }

  return {
    check,
    onChange: (raw: string) => schedule(raw, 400),
    onBlur: (raw: string) => schedule(raw, 0),
  };
}

function IqonicIdStatus({ check }: { check: LiveCheck }) {
  if (check.status === "idle") return null;
  if (check.status === "checking") {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-500" role="status">
        <Spinner className="h-3 w-3" /> Verificando…
      </p>
    );
  }
  if (check.status === "available") {
    return (
      <p className="mt-1.5 text-xs text-wa" role="status">
        ✓ Número disponible
      </p>
    );
  }
  return (
    <p className="mt-1.5 text-xs text-red-400" role="alert">
      {check.message}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* Piezas                                                               */
/* ------------------------------------------------------------------ */

const icon = (path: string) => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={path} />
  </svg>
);

const firstName = (name: string) => name.split(" ")[0] || name;

/** "Invitado por Juan Pérez" (solo si llegó con el enlace de un distribuidor). */
function SponsorChip({ sponsor }: { sponsor: SponsorState }) {
  if (sponsor.status !== "ready") return null;
  return (
    <p className="flex items-center gap-2.5 rounded-2xl border border-brand-violet/25 bg-brand-violet/[.07] px-3.5 py-2.5 text-sm text-zinc-300">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-orange to-brand-violet text-xs font-bold text-white" aria-hidden="true">
        {sponsor.sponsor.name.charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0">
        Invitado por <strong className="font-semibold text-white">{sponsor.sponsor.name}</strong>
      </span>
    </p>
  );
}

/** Sí / No compacto sobre radios reales (teclado y lectores de pantalla). */
function YesNo({ name, value, onChange }: { name: string; value: boolean | null; onChange: (v: boolean) => void }) {
  const option = (v: boolean, label: string) => (
    <label
      className={`flex-1 cursor-pointer rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition has-focus-visible:ring-2 has-focus-visible:ring-brand-violet/50 ${
        value === v ? "bg-brand-violet/20 text-white ring-1 ring-inset ring-brand-violet/60" : "text-zinc-400 hover:bg-white/5 hover:text-white"
      }`}
    >
      <input type="radio" name={name} value={String(v)} checked={value === v} onChange={() => onChange(v)} className="sr-only" />
      {label}
    </label>
  );
  return (
    <div className="flex gap-1 rounded-2xl border border-white/10 bg-ink-950/60 p-1">
      {option(true, "Sí, ya lo tengo")}
      {option(false, "Todavía no")}
    </div>
  );
}

/** Distribuidor sin número: en vez de registrarse, habla con quien lo invitó. */
function ActivateCodeCard({ sponsor, onChooseClient }: { sponsor: SponsorState; onChooseClient: () => void }) {
  const ready = sponsor.status === "ready" && sponsor.sponsor.whatsapp ? sponsor.sponsor : null;
  const message = ready
    ? `Hola ${firstName(ready.name)}, entré a tu link de IQONIC y quiero saber más sobre los planes para iniciar como distribuidor`
    : "Hola, entré a la web de IQONIC y quiero saber más sobre los planes para iniciar como distribuidor";
  const href = buildWhatsAppUrl(message, ready?.whatsapp ?? DEFAULT_WHATSAPP);

  return (
    <div className="space-y-4">
      <section
        aria-labelledby="activate-title"
        className="relative overflow-hidden rounded-2xl border border-white/[.08] bg-gradient-to-br from-brand-violet/[.14] via-white/[.02] to-brand-orange/[.10] p-5"
      >
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-brand-violet/25 blur-3xl" aria-hidden="true" />
        <div className="relative">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-brand-gold">
            {icon("M12 2l3 6.5 7 .9-5.1 4.8 1.3 7L12 17.8 5.8 21.2l1.3-7L2 9.4l7-.9z")}
          </span>
          <h3 id="activate-title" className="mt-3 font-display text-lg font-bold text-white">
            Primero activa tu código oficial
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-zinc-400">
            Para registrarte como distribuidor necesitas tu número de distribuidor IQONIC.{" "}
            {ready ? (
              <>
                <strong className="font-semibold text-zinc-200">{ready.name}</strong> te explica los planes para empezar y te
                ayuda a darte de alta.
              </>
            ) : (
              "Escríbenos y te contamos los planes para empezar."
            )}
          </p>

          {sponsor.status === "loading" ? (
            <span className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-white/5 px-5 py-3 text-sm font-semibold text-zinc-400">
              <Spinner /> Cargando contacto…
            </span>
          ) : (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-wa mt-5 inline-flex w-full items-center justify-center gap-2.5 rounded-2xl px-5 py-3 text-sm font-bold text-ink-950"
            >
              <WhatsAppIcon className="h-5 w-5" />
              {ready ? `Escribirle a ${firstName(ready.name)} por WhatsApp` : "Escribirnos por WhatsApp"}
            </a>
          )}
        </div>
      </section>

      <p className="text-center text-sm text-zinc-500">
        ¿Solo quieres comprar productos?{" "}
        <button type="button" onClick={onChooseClient} className="font-semibold text-brand-violet-light underline-offset-4 hover:text-white hover:underline">
          Regístrate como Cliente aquí
        </button>
      </p>
    </div>
  );
}

function Section({ children }: { children: ReactNode }) {
  return <div className="space-y-4 rounded-2xl border border-white/[.08] bg-white/[.02] p-4">{children}</div>;
}

/* ------------------------------------------------------------------ */
/* Formulario                                                           */
/* ------------------------------------------------------------------ */

export function SignUpForm() {
  // Sin ?next= el servidor decide: /dashboard para distribuidores, /cuenta para clientes
  const next = useSearchParams().get("next") ?? "";
  const { state, onSubmit, pending, errors } = useFormAction(signUpCustomer);
  const sponsor = useReferralSponsor();

  const restored = state.values;
  const [role, setRole] = useState<SignUpRole | null>(
    restored?.role === "distributor" || restored?.role === "client" ? restored.role : null,
  );
  // Si el servidor devolvió un error, ya había escrito su número
  const [hasIqonicId, setHasIqonicId] = useState<boolean | null>(restored?.role === "distributor" ? true : null);
  const [phone, setPhone] = useState<PhoneValue>(() =>
    restored?.whatsapp ? splitWhatsApp(restored.whatsapp) : { countryId: DEFAULT_COUNTRY_ID, local: "" },
  );
  const { check, onChange: onIqonicChange, onBlur: onIqonicBlur } = useIqonicIdCheck();

  // Registro completado: ocultamos el formulario y mostramos el aviso del correo
  if (state.status === "success") {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-wa/10 text-wa">
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 6h16v12H4z" />
            <path d="M4 7l8 6 8-6" />
          </svg>
        </div>
        <p className="text-sm leading-relaxed text-zinc-300" role="status">{state.message}</p>
        <p className="text-xs text-zinc-500">¿No llega? Revisa la carpeta de spam o promociones.</p>
      </div>
    );
  }

  const isDistributor = role === "distributor";
  /** Distribuidor sin número: no hay cuenta que crear todavía. */
  const showAccountFields = role === "client" || (isDistributor && hasIqonicId === true);
  const iqonicTaken = isDistributor && check.status === "taken";
  const whatsappDigits = phone.local.trim() ? joinWhatsApp(phone.countryId, phone.local) : "";

  function chooseClient() {
    setRole("client");
    // Lleva el foco al formulario que acaba de aparecer
    requestAnimationFrame(() => document.getElementById("full_name")?.focus());
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="referred_by_iqonic_id" value={sponsor.status === "ready" ? (sponsor.sponsor.iqonicId ?? "") : ""} />
      {next === "/pago" && state.status === "idle" && <CheckoutNotice />}
      <SponsorChip sponsor={sponsor} />
      <FormMessage status={state.status} message={state.message} />

      <fieldset className="space-y-2">
        <legend className="mb-2 block text-sm font-semibold text-white">¿Cómo quieres registrarte?</legend>
        {/* Una columna: el formulario es angosto y en dos el título se corta */}
        <div className="grid gap-2">
          <OptionCard
            name="role"
            value="client"
            checked={role === "client"}
            onSelect={() => setRole("client")}
            icon={icon("M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0")}
            title="Quiero comprar como Cliente"
            description="Compra productos y sigue tus pedidos."
          />
          <OptionCard
            name="role"
            value="distributor"
            checked={isDistributor}
            onSelect={() => setRole("distributor")}
            icon={icon("M3 9l1-5h16l1 5M3 9h18M3 9v11h18V9M9 20v-6h6v6")}
            title="Soy Distribuidor de IQONIC"
            description="Comparte tu enlace y suma clientes a tu red."
          />
        </div>
        {errors.role && <p className="text-xs text-red-400">{errors.role}</p>}
      </fieldset>

      {isDistributor && (
        <fieldset className="space-y-2">
          <legend className="mb-2 block text-sm font-semibold text-white">¿Ya tienes tu número de Distribuidor IQONIC?</legend>
          <YesNo name="has_iqonic_id" value={hasIqonicId} onChange={setHasIqonicId} />
        </fieldset>
      )}

      {isDistributor && hasIqonicId === false && <ActivateCodeCard sponsor={sponsor} onChooseClient={chooseClient} />}

      {showAccountFields && (
        <>
          {isDistributor && (
            <Section>
              <Field label="Número de IQONIC" htmlFor="iqonic_id" error={errors.iqonic_id}>
                <input
                  {...fieldProps("iqonic_id", errors)}
                  aria-describedby={errors.iqonic_id ? "iqonic_id-error" : "iqonic_id-help"}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  maxLength={40}
                  defaultValue={restored?.iqonic_id}
                  className={`${inputClass} uppercase tracking-wide`}
                  placeholder="Ej. 123456"
                  onChange={(e) => onIqonicChange(e.target.value)}
                  onBlur={(e) => onIqonicBlur(e.target.value)}
                />
                {!errors.iqonic_id && check.status === "idle" && (
                  <p id="iqonic_id-help" className="mt-1.5 text-xs leading-relaxed text-zinc-500">
                    {IQONIC_ID_HELP}
                  </p>
                )}
                {!errors.iqonic_id && <IqonicIdStatus check={check} />}
              </Field>
            </Section>
          )}

          <Field label="Nombre completo" htmlFor="full_name" error={errors.full_name}>
            <input
              {...fieldProps("full_name", errors)}
              autoComplete="name"
              maxLength={121}
              defaultValue={restored?.full_name}
              className={inputClass}
              placeholder="Nombre y apellido"
            />
          </Field>

          <Field label="Correo" htmlFor="email" error={errors.email}>
            <input
              {...fieldProps("email", errors)}
              type="email"
              autoComplete="email"
              defaultValue={restored?.email}
              className={inputClass}
              placeholder="tu@correo.com"
            />
          </Field>

          <div>
            <input type="hidden" name="whatsapp" value={whatsappDigits} />
            <WhatsAppPhoneField
              value={phone}
              onChange={setPhone}
              error={errors.whatsapp}
              inputName="whatsapp_local"
              label={isDistributor ? "WhatsApp" : "WhatsApp (opcional)"}
              previewText={isDistributor ? "Tus clientes te escribirán a" : "Te contactaremos a"}
            />
          </div>

          <Field label="Contraseña" htmlFor="password" error={errors.password} hint="Mínimo 8 caracteres, con letras y números">
            <PasswordInput {...fieldProps("password", errors)} autoComplete="new-password" />
          </Field>
          <Field label="Repite la contraseña" htmlFor="password_confirm" error={errors.password_confirm}>
            <PasswordInput {...fieldProps("password_confirm", errors)} autoComplete="new-password" />
          </Field>

          <div className="pt-1">
            <SubmitButton pending={pending} disabled={iqonicTaken} pendingText="Creando cuenta…">
              {isDistributor ? "Crear cuenta de distribuidor" : "Crear cuenta"}
            </SubmitButton>
            {iqonicTaken && (
              <p className="mt-2 text-center text-xs text-red-400">Corrige tu número de IQONIC para continuar.</p>
            )}
          </div>
          <p className="text-center text-xs leading-relaxed text-zinc-600">
            Tu contraseña se guarda cifrada. Usamos tus datos solo para gestionar tus pedidos.
          </p>
        </>
      )}
    </form>
  );
}
