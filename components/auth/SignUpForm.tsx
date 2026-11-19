"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { checkIqonicIdAvailability, signUpCustomer, type IqonicIdCheck } from "@/app/auth/actions";
import { CheckoutNotice } from "@/components/auth/CheckoutNotice";
import { fieldProps, FormMessage, PasswordInput, SubmitButton } from "@/components/auth/AuthUI";
import { useFormAction } from "@/components/auth/useFormAction";
import { OptionCard } from "@/components/checkout/OptionCard";
import { Field, inputClass, Spinner } from "@/components/ui/fields";
import { useActiveReferral } from "@/lib/use-active-referral";
import { IQONIC_ID_REGEX, normalizeIqonicId, type SignUpRole } from "@/lib/validation/customer";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

type LiveCheck = { status: "idle" } | { status: "checking" } | IqonicIdCheck;

/**
 * Verificación en vivo del Iqonic ID (400 ms después de dejar de escribir).
 * Solo es una ayuda: el servidor y el UNIQUE de la BD validan de nuevo al enviar.
 */
function useIqonicIdCheck() {
  const [check, setCheck] = useState<LiveCheck>({ status: "idle" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef("");

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function onValueChange(raw: string) {
    const value = normalizeIqonicId(raw);
    latest.current = value;
    if (timer.current) clearTimeout(timer.current);
    if (!IQONIC_ID_REGEX.test(value)) return setCheck({ status: "idle" });

    setCheck({ status: "checking" });
    timer.current = setTimeout(async () => {
      const result = await checkIqonicIdAvailability(value).catch(
        (): IqonicIdCheck => ({ status: "error", message: "No pudimos verificar el Iqonic ID." }),
      );
      // Ignora respuestas viejas si siguió escribiendo
      if (latest.current === value) setCheck(result);
    }, 400);
  }

  return { check, onValueChange };
}

function IqonicIdStatus({ check }: { check: LiveCheck }) {
  if (check.status === "checking") {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-500" role="status">
        <Spinner className="h-3 w-3" /> Verificando…
      </p>
    );
  }
  if (check.status === "available") {
    return <p className="mt-1.5 text-xs text-wa" role="status">✓ Disponible</p>;
  }
  if (check.status === "idle") return null;
  return <p className="mt-1.5 text-xs text-red-400" role="status">{check.message}</p>;
}

/** Para el prospecto que quiere ser distribuidor pero aún no tiene Iqonic ID. */
function SponsorContact() {
  const sponsor = useActiveReferral();
  const message = "Hola, quiero ser distribuidor/a de IQONIC y todavía no tengo mi Iqonic ID. ¿Me ayudas?";
  const href = sponsor ? buildWhatsAppUrl(message, sponsor.whatsapp) : buildWhatsAppUrl(message);
  return (
    <p className="text-xs leading-relaxed text-zinc-500">
      ¿Todavía no tienes tu Iqonic ID?{" "}
      <a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-wa hover:underline">
        {sponsor ? `Escríbele a ${sponsor.nombre_mostrar} por WhatsApp` : "Escríbenos por WhatsApp"}
      </a>{" "}
      y te ayudamos a darte de alta.
    </p>
  );
}

const roleIcon = (path: string) => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={path} />
  </svg>
);

export function SignUpForm() {
  const next = useSearchParams().get("next") ?? "/cuenta";
  const { state, onSubmit, pending, errors } = useFormAction(signUpCustomer);
  const [role, setRole] = useState<SignUpRole>(state.values?.role === "distributor" ? "distributor" : "client");
  const { check, onValueChange } = useIqonicIdCheck();

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

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {next === "/pago" && state.status === "idle" && <CheckoutNotice />}
      <FormMessage status={state.status} message={state.message} />

      <fieldset className="space-y-2">
        <legend className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">Me registro como</legend>
        {/* Una columna: el formulario es angosto y en dos el título se corta */}
        <div className="grid gap-2">
          <OptionCard
            name="role"
            value="client"
            checked={role === "client"}
            onSelect={() => setRole("client")}
            icon={roleIcon("M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z")}
            title="Cliente"
            description="Compro productos"
          />
          <OptionCard
            name="role"
            value="distributor"
            checked={role === "distributor"}
            onSelect={() => setRole("distributor")}
            icon={roleIcon("M3 9l1-5h16l1 5M3 9h18M3 9v11h18V9M9 20v-6h6v6")}
            title="Distribuidor"
            description="Tengo mi Iqonic ID"
          />
        </div>
      </fieldset>

      {role === "distributor" && (
        <div className="space-y-4 rounded-2xl border border-white/[.08] bg-white/[.02] p-4">
          <Field label="Iqonic ID" htmlFor="iqonic_id" error={errors.iqonic_id}>
            <input
              {...fieldProps("iqonic_id", errors)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={40}
              className={`${inputClass} uppercase`}
              placeholder="Tu ID de distribuidor"
              onChange={(e) => onValueChange(e.target.value)}
            />
            {!errors.iqonic_id && <IqonicIdStatus check={check} />}
          </Field>
          <Field
            label="WhatsApp"
            htmlFor="whatsapp"
            error={errors.whatsapp}
            hint="Con código de país. Tus clientes te escribirán aquí."
          >
            <input {...fieldProps("whatsapp", errors)} type="tel" autoComplete="tel" inputMode="tel" className={inputClass} placeholder="+54 9 11 2345 6789" />
          </Field>
          <SponsorContact />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" htmlFor="first_name" error={errors.first_name}>
          <input {...fieldProps("first_name", errors)} autoComplete="given-name" className={inputClass} />
        </Field>
        <Field label="Apellido" htmlFor="last_name" error={errors.last_name}>
          <input {...fieldProps("last_name", errors)} autoComplete="family-name" className={inputClass} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Teléfono" htmlFor="phone" error={errors.phone} hint="Con código de país, ej. +52…">
          <input {...fieldProps("phone", errors)} type="tel" autoComplete="tel" inputMode="tel" className={inputClass} placeholder="+52 55 1234 5678" />
        </Field>
        <Field label="Fecha de nacimiento" htmlFor="birth_date" error={errors.birth_date}>
          <input {...fieldProps("birth_date", errors)} type="date" autoComplete="bday" min="1900-01-01" className={`${inputClass} [color-scheme:dark]`} />
        </Field>
      </div>

      <Field label="Correo" htmlFor="email" error={errors.email}>
        <input {...fieldProps("email", errors)} type="email" autoComplete="email" className={inputClass} placeholder="tu@correo.com" />
      </Field>

      <Field label="Contraseña" htmlFor="password" error={errors.password} hint="Mínimo 8 caracteres, con letras y números">
        <PasswordInput {...fieldProps("password", errors)} autoComplete="new-password" />
      </Field>
      <Field label="Repite la contraseña" htmlFor="password_confirm" error={errors.password_confirm}>
        <PasswordInput {...fieldProps("password_confirm", errors)} autoComplete="new-password" />
      </Field>

      <div className="pt-2">
        <SubmitButton pending={pending} pendingText="Creando cuenta…">
          {role === "distributor" ? "Crear cuenta de distribuidor" : "Crear cuenta"}
        </SubmitButton>
      </div>
      <p className="text-center text-xs leading-relaxed text-zinc-600">
        Tu contraseña se guarda cifrada. Usamos tus datos solo para gestionar tus pedidos.
      </p>
    </form>
  );
}
