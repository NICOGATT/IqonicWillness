"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

import { upsertDistributorProfile } from "@/app/referidos/actions";
import { SubmitButton } from "@/components/auth/AuthUI";
import { ShareLinkCard, buildReferralLink } from "@/components/referrals/ShareLinkCard";
import { WhatsAppPhoneField, type PhoneValue } from "@/components/referrals/WhatsAppPhoneField";
import { Field, inputClass, Spinner } from "@/components/ui/fields";
import { Toast, useToast } from "@/components/ui/Toast";
import { siteConfig } from "@/config/site";
import {
  distributorProfileSchema,
  isValidSlugFormat,
  RESERVED_SLUGS,
  SLUG_MAX,
  slugify,
  type DistributorProfileField,
} from "@/lib/validation/referral";
import { joinWhatsApp, splitWhatsApp } from "@/lib/whatsapp-countries";
import type { DistribuidorRow } from "@/types/database";
import { isSupabaseConfigured } from "@/utils/supabase/env";
import { createClient } from "@/utils/supabase/client";

type Profile = Pick<DistribuidorRow, "slug" | "nombre_mostrar" | "whatsapp" | "activo">;
type FieldErrors = Partial<Record<DistributorProfileField, string>>;
type SlugStatus = "idle" | "checking" | "available" | "taken";

/**
 * Normaliza el slug MIENTRAS se escribe: minúsculas, sin tildes, espacios → guiones.
 * Deja un guion final para poder seguir escribiendo ("nico-" → "nico-gatti");
 * al salir del campo y al guardar se limpia del todo.
 */
function normalizeSlugInput(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .slice(0, SLUG_MAX);
}

const finalizeSlug = (value: string) => value.replace(/-+$/, "");

/**
 * Configuración de la tienda replicada (nombre, enlace y WhatsApp) + tarjeta
 * para compartir el enlace una vez guardado el perfil.
 */
export function DistributorProfileForm({
  profile: initialProfile,
  siteUrl,
  suggestedName,
}: {
  profile: Profile | null;
  siteUrl: string;
  /** Para precargar el nombre la primera vez (perfil de cliente). */
  suggestedName?: string;
}) {
  const router = useRouter();
  const { toast, show, dismiss } = useToast();

  const [saved, setSaved] = useState<Profile | null>(initialProfile);
  const [name, setName] = useState(initialProfile?.nombre_mostrar ?? suggestedName ?? "");
  const [slug, setSlug] = useState(initialProfile?.slug ?? (suggestedName ? slugify(suggestedName) : ""));
  // Mientras no toque el slug a mano, se sugiere a partir del nombre (solo al crear)
  const [slugTouched, setSlugTouched] = useState(Boolean(initialProfile));
  const [phone, setPhone] = useState<PhoneValue>(() => splitWhatsApp(initialProfile?.whatsapp ?? ""));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const checkTimer = useRef<number | undefined>(undefined);
  const checkId = useRef(0);

  const cleanSlug = finalizeSlug(slug);
  const whatsapp = joinWhatsApp(phone.countryId, phone.local);
  const dirty =
    !saved || saved.nombre_mostrar !== name.trim() || saved.slug !== cleanSlug || saved.whatsapp !== whatsapp;

  /** Consulta (con pausa) si el slug está libre. El servidor lo vuelve a comprobar al guardar. */
  function scheduleSlugCheck(value: string) {
    window.clearTimeout(checkTimer.current);
    const id = ++checkId.current;
    const candidate = finalizeSlug(value);
    if (!isSupabaseConfigured() || !isValidSlugFormat(candidate) || RESERVED_SLUGS.has(candidate) || candidate === saved?.slug) {
      setSlugStatus("idle");
      return;
    }
    setSlugStatus("checking");
    checkTimer.current = window.setTimeout(async () => {
      const { data, error } = await createClient().rpc("slug_disponible", { p_slug: candidate });
      if (id !== checkId.current) return; // llegó tarde: ya escribió otra cosa
      setSlugStatus(error ? "idle" : data ? "available" : "taken");
    }, 450);
  }

  function updateSlug(value: string, fromName = false) {
    const next = fromName ? slugify(value) : normalizeSlugInput(value);
    setSlug(next);
    setErrors((e) => ({ ...e, slug: undefined }));
    scheduleSlugCheck(next);
  }

  function handleNameChange(value: string) {
    setName(value);
    setErrors((e) => ({ ...e, nombre_mostrar: undefined }));
    if (!slugTouched) updateSlug(value, true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const input = { nombre_mostrar: name, slug: cleanSlug, whatsapp };
    setSlug(cleanSlug);

    // Mismas reglas que el servidor: errores al instante, sin ida y vuelta
    const parsed = distributorProfileSchema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) fieldErrors[issue.path[0] as DistributorProfileField] ??= issue.message;
      setErrors(fieldErrors);
      show("error", "Revisa los datos marcados en rojo.");
      return;
    }
    if (slugStatus === "taken") {
      setErrors({ slug: `"${cleanSlug}" ya está en uso, prueba con otro.` });
      show("error", "Ese enlace ya está en uso.");
      return;
    }

    setPending(true);
    try {
      const result = await upsertDistributorProfile(input);
      if (result.ok) {
        setSaved(result.profile);
        setSlug(result.profile.slug);
        setSlugTouched(true);
        setErrors({});
        setSlugStatus("idle");
        show("success", result.created ? "¡Tu tienda está lista! Ya puedes compartir tu enlace." : "Configuración guardada.");
        router.refresh(); // vuelve a leer métricas y pedidos en el servidor
      } else {
        setErrors(result.fieldErrors ?? {});
        if (result.reason === "slug-taken") setSlugStatus("taken");
        show("error", result.error);
        if (result.reason === "unauthenticated") router.push("/ingresar?next=/dashboard/tienda");
      }
    } catch {
      show("error", "No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setPending(false);
    }
  }

  const previewLink = buildReferralLink(siteUrl, cleanSlug || "tu-nombre");

  return (
    <div className="space-y-6">
      {saved && <ShareLinkCard siteUrl={siteUrl} slug={saved.slug} name={saved.nombre_mostrar} notify={show} />}

      {saved && !saved.activo && (
        <p role="status" className="rounded-2xl border border-brand-gold/30 bg-brand-gold/10 px-4 py-3 text-sm text-brand-gold">
          Tu tienda está <strong>pausada</strong> por el equipo de {siteConfig.name}: los pedidos de tu enlace llegan a la
          tienda principal. Escríbenos si crees que es un error.
        </p>
      )}

      <section aria-labelledby="config-title" className="rounded-3xl border border-white/[.08] bg-white/[.02] p-6 sm:p-8">
        <h2 id="config-title" className="font-display text-lg font-bold text-white">
          {saved ? "Configuración de tu tienda" : "Crea tu tienda"}
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          {saved
            ? "Puedes cambiar estos datos cuando quieras. Si cambias el enlace, el anterior deja de funcionar."
            : "Elige cómo te verán tus clientes y a qué WhatsApp llegarán sus pedidos."}
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
          <Field
            label="Nombre para mostrar"
            htmlFor="nombre_mostrar"
            error={errors.nombre_mostrar}
            hint='Así aparecerá en la tienda: "Estás comprando en la tienda de …"'
          >
            <input
              id="nombre_mostrar"
              name="nombre_mostrar"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              maxLength={80}
              autoComplete="name"
              placeholder="Ej.: Nico Gatti"
              aria-invalid={Boolean(errors.nombre_mostrar)}
              aria-describedby={errors.nombre_mostrar ? "nombre_mostrar-error" : undefined}
              className={inputClass}
            />
          </Field>

          <div>
            <label htmlFor="slug" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Alias de tu enlace
            </label>
            <div className="relative">
              <input
                id="slug"
                name="slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  updateSlug(e.target.value);
                }}
                onBlur={() => setSlug((s) => finalizeSlug(s))}
                maxLength={SLUG_MAX}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="nico-gatti"
                aria-invalid={Boolean(errors.slug) || slugStatus === "taken"}
                aria-describedby="slug-help"
                className={`${inputClass} pr-28 font-medium`}
              />
              <SlugStatusBadge status={slugStatus} />
            </div>
            <div id="slug-help" className="mt-1.5 text-xs">
              {errors.slug ? (
                <p className="text-red-400">{errors.slug}</p>
              ) : slugStatus === "taken" ? (
                <p className="text-red-400">Ese alias ya lo usa otro distribuidor, prueba con otro.</p>
              ) : (
                <p className="text-zinc-600">Solo minúsculas, números y guiones. Lo convertimos automáticamente.</p>
              )}
              <p className="mt-2 break-all rounded-xl border border-white/[.06] bg-ink-950/60 px-3 py-2 font-mono text-[13px] text-zinc-500">
                {previewLink.slice(0, previewLink.length - (cleanSlug || "tu-nombre").length)}
                <span className={cleanSlug ? "font-semibold text-brand-violet-light" : "text-zinc-600"}>
                  {cleanSlug || "tu-nombre"}
                </span>
              </p>
            </div>
          </div>

          <WhatsAppPhoneField
            value={phone}
            onChange={(value) => {
              setPhone(value);
              setErrors((e) => ({ ...e, whatsapp: undefined }));
            }}
            error={errors.whatsapp}
          />

          <div className="flex flex-col-reverse items-stretch gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-600">
              {saved && !dirty ? "Todo guardado." : saved ? "Tienes cambios sin guardar." : " "}
            </p>
            <div className="sm:w-60">
              <SubmitButton pending={pending} pendingText="Guardando…">
                {saved ? "Guardar configuración" : "Crear mi tienda"}
              </SubmitButton>
            </div>
          </div>
        </form>
      </section>

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  );
}

function SlugStatusBadge({ status }: { status: SlugStatus }) {
  if (status === "idle") return null;
  const content = {
    checking: (
      <span className="text-zinc-500">
        <Spinner className="h-3.5 w-3.5" /> Revisando
      </span>
    ),
    available: <span className="text-wa">✓ Disponible</span>,
    taken: <span className="text-red-400">✕ En uso</span>,
  }[status];
  return (
    <span aria-live="polite" className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold [&>span]:inline-flex [&>span]:items-center [&>span]:gap-1.5">
      {content}
    </span>
  );
}
