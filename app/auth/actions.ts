"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { safeNextPath } from "@/lib/customer";
import { resolveReferrerIqonicId } from "@/lib/referrals";
import { toFieldErrors } from "@/lib/validation/product";
import {
  formToObject,
  iqonicIdSchema,
  newPasswordSchema,
  profileSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/customer";
import { isSupabaseConfigured } from "@/utils/supabase/env";
import { createClient } from "@/utils/supabase/server";

/**
 * Server Actions de las cuentas de clientes.
 *
 * Las contraseñas se envían a Supabase Auth, que las guarda cifradas (bcrypt).
 * Nunca se escriben en nuestras tablas ni en logs.
 */

export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Valores para volver a rellenar el formulario (nunca contraseñas). */
  values?: Record<string, string>;
};

/** URL pública del sitio, para los enlaces de los correos. */
async function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

const withoutPasswords = (values: Record<string, string>) => {
  const rest = { ...values };
  delete rest.password;
  delete rest.password_confirm;
  return rest;
};

// ---------------------------------------------------------------------
// Registro
// ---------------------------------------------------------------------
export type IqonicIdCheck =
  | { status: "available"; iqonicId: string }
  | { status: "taken" | "invalid" | "error"; message: string };

/**
 * ¿Está libre este iqonic_id? Para validar en vivo mientras se escribe en el
 * registro (sin sesión). La BD vuelve a garantizarlo con UNIQUE al registrar.
 */
export async function checkIqonicIdAvailability(value: string): Promise<IqonicIdCheck> {
  const parsed = iqonicIdSchema.safeParse(typeof value === "string" ? value.slice(0, 80) : "");
  if (!parsed.success) return { status: "invalid", message: parsed.error.issues[0].message };
  if (!isSupabaseConfigured()) return { status: "error", message: "El registro no está disponible en este momento." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("iqonic_id_disponible", { p_iqonic_id: parsed.data });
  if (error) {
    console.error("[auth] iqonic_id_disponible:", error.code, error.message);
    return { status: "error", message: "No pudimos verificar el Iqonic ID. Inténtalo de nuevo." };
  }
  return data
    ? { status: "available", iqonicId: parsed.data }
    : { status: "taken", message: "Ese Iqonic ID ya está registrado en la plataforma." };
}

const SIGN_UP_FIELDS = [
  "full_name",
  "email",
  "password",
  "password_confirm",
  "role",
  "iqonic_id",
  "whatsapp",
  "referred_by_iqonic_id",
  "next",
];

export async function signUpCustomer(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formToObject(formData, SIGN_UP_FIELDS);
  const values = withoutPasswords(raw);
  delete values.next;
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: "Revisa los campos marcados.", fieldErrors: toFieldErrors(parsed.error), values };
  }

  const { email, password, full_name, first_name, last_name, role, iqonic_id, whatsapp } = parsed.data;
  const isDistributor = role === "distributor";
  // Adónde volver al terminar (p. ej. /pago si venía del checkout); solo rutas internas.
  // Un distribuidor sin destino explícito va directo a su panel.
  const next = safeNextPath(raw.next, isDistributor ? "/dashboard" : "/cuenta");
  const supabase = await createClient();

  // Distribuidor: el iqonic_id tiene que estar libre. Si la verificación falla
  // no se bloquea: el UNIQUE de la BD tiene la última palabra (ver más abajo).
  if (isDistributor && iqonic_id) {
    const { data: available, error: rpcError } = await supabase.rpc("iqonic_id_disponible", { p_iqonic_id: iqonic_id });
    if (rpcError) console.error("[auth] iqonic_id_disponible:", rpcError.code, rpcError.message);
    else if (!available) {
      return {
        status: "error",
        message: "Revisa los campos marcados.",
        fieldErrors: { iqonic_id: "Ese Iqonic ID ya está registrado en la plataforma." },
        values,
      };
    }
  }

  // Patrocinador: cookies de referido → copia del navegador → distribuidor por
  // defecto → null (orgánico). Se guarda para clientes Y distribuidores.
  const referredBy = await resolveReferrerIqonicId(parsed.data.referred_by_iqonic_id);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // El trigger handle_new_customer() copia estos datos a public.customers
      // y vuelve a validarlos (role, iqonic_id único, patrocinador existente).
      data: {
        first_name,
        last_name,
        full_name,
        // El WhatsApp también es su teléfono de contacto (precarga el checkout)
        phone: whatsapp ? `+${whatsapp}` : null,
        role,
        iqonic_id,
        whatsapp,
        referred_by_iqonic_id: referredBy !== iqonic_id ? referredBy : null,
      },
      emailRedirectTo: `${await getSiteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    console.error("[auth] signUp:", error.code, error.message);

    // El trigger rechazó el alta (Supabase lo devuelve como "Database error
    // saving new user"). Con un distribuidor casi siempre es que otro tomó el
    // mismo iqonic_id entre la verificación y el registro.
    if (isDistributor && iqonic_id && (error.code === "unexpected_failure" || /database error/i.test(error.message))) {
      const check = await checkIqonicIdAvailability(iqonic_id);
      if (check.status === "taken") {
        return { status: "error", message: "Revisa los campos marcados.", fieldErrors: { iqonic_id: check.message }, values };
      }
    }

    const message =
      error.code === "weak_password"
        ? "La contraseña es demasiado débil. Prueba con una más larga."
        : error.code === "over_email_send_rate_limit"
          ? "Se enviaron demasiados correos. Espera unos minutos e inténtalo de nuevo."
          : error.code === "signup_disabled"
            ? "El registro está desactivado en este momento."
            : "No pudimos crear tu cuenta. Inténtalo de nuevo.";
    return { status: "error", message, values };
  }

  // Si el proyecto no exige confirmar el correo, ya hay sesión
  if (data.session) redirect(next);

  // Mensaje neutro: Supabase no revela si el correo ya estaba registrado
  return {
    status: "success",
    message: `Te enviamos un correo a ${email}. Abre el enlace para activar tu cuenta y luego inicia sesión.`,
  };
}

// ---------------------------------------------------------------------
// Inicio y cierre de sesión
// ---------------------------------------------------------------------
export async function signInCustomer(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formToObject(formData, ["email", "password", "next"]);
  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", fieldErrors: toFieldErrors(parsed.error), values: { email: raw.email } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const message =
      error.code === "email_not_confirmed"
        ? "Todavía no confirmaste tu correo. Revisa tu bandeja de entrada (y spam)."
        : "Correo o contraseña incorrectos.";
    return { status: "error", message, values: { email: raw.email } };
  }
  redirect(safeNextPath(raw.next));
}

export async function signOutCustomer() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// ---------------------------------------------------------------------
// Recuperar contraseña
// ---------------------------------------------------------------------
export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const parsed = signInSchema.shape.email.safeParse(email);
  if (!parsed.success) return { status: "error", fieldErrors: { email: "Correo inválido" }, values: { email } };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${await getSiteUrl()}/auth/callback?next=/cuenta/nueva-contrasena`,
  });
  if (error) console.error("[auth] resetPassword:", error.code, error.message);

  // Siempre el mismo mensaje, exista o no la cuenta
  return {
    status: "success",
    message: "Si hay una cuenta con ese correo, te enviamos un enlace para crear una nueva contraseña.",
  };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = newPasswordSchema.safeParse(formToObject(formData, ["password", "password_confirm"]));
  if (!parsed.success) return { status: "error", fieldErrors: toFieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    const message =
      error.code === "same_password"
        ? "La nueva contraseña debe ser distinta de la anterior."
        : "No se pudo cambiar la contraseña. Pide un enlace nuevo e inténtalo otra vez.";
    return { status: "error", message };
  }
  redirect("/cuenta?ok=password");
}

// ---------------------------------------------------------------------
// Perfil
// ---------------------------------------------------------------------
export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = formToObject(formData, ["first_name", "last_name", "phone", "birth_date"]);
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "error", message: "Revisa los campos marcados.", fieldErrors: toFieldErrors(parsed.error), values: raw };
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/ingresar?next=/cuenta");

  // RLS garantiza que solo pueda actualizar su propia fila
  const { error } = await supabase.from("customers").update(parsed.data).eq("id", userId);
  if (error) {
    console.error("[auth] updateProfile:", error.message);
    return { status: "error", message: "No se pudieron guardar los cambios.", values: raw };
  }
  // Mantiene el nombre de los metadatos al día (lo usa el enlace "Mi cuenta")
  await supabase.auth.updateUser({ data: { first_name: parsed.data.first_name } });

  refresh();
  return { status: "success", message: "Datos actualizados." };
}
