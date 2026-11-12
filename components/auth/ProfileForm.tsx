"use client";

import { updateProfile } from "@/app/auth/actions";
import { fieldProps, FormMessage, SubmitButton } from "@/components/auth/AuthUI";
import { useFormAction } from "@/components/auth/useFormAction";
import { Field, inputClass } from "@/components/ui/fields";
import type { CustomerRow } from "@/types/database";

type Editable = Pick<CustomerRow, "first_name" | "last_name" | "phone" | "birth_date">;

/** Datos personales editables por el propio cliente. */
export function ProfileForm({ profile, email }: { profile: Editable | null; email: string | null }) {
  const { state, onSubmit, pending, errors } = useFormAction(updateProfile);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormMessage status={state.status} message={state.message} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" htmlFor="first_name" error={errors.first_name}>
          <input {...fieldProps("first_name", errors)} defaultValue={profile?.first_name ?? ""} autoComplete="given-name" className={inputClass} />
        </Field>
        <Field label="Apellido" htmlFor="last_name" error={errors.last_name}>
          <input {...fieldProps("last_name", errors)} defaultValue={profile?.last_name ?? ""} autoComplete="family-name" className={inputClass} />
        </Field>
        <Field label="Teléfono" htmlFor="phone" error={errors.phone}>
          <input {...fieldProps("phone", errors)} defaultValue={profile?.phone ?? ""} type="tel" autoComplete="tel" inputMode="tel" className={inputClass} />
        </Field>
        <Field label="Fecha de nacimiento" htmlFor="birth_date" error={errors.birth_date}>
          <input {...fieldProps("birth_date", errors)} defaultValue={profile?.birth_date ?? ""} type="date" min="1900-01-01" autoComplete="bday" className={`${inputClass} [color-scheme:dark]`} />
        </Field>
      </div>

      <Field label="Correo" htmlFor="email" hint="El correo no se puede cambiar desde aquí.">
        <input id="email" value={email ?? ""} readOnly disabled className={`${inputClass} opacity-60`} />
      </Field>

      <div className="sm:w-56">
        <SubmitButton pending={pending} pendingText="Guardando…">Guardar cambios</SubmitButton>
      </div>
    </form>
  );
}
