-- =====================================================================
-- IQONIC THRIVE · Clientes
-- Ejecutar DESPUÉS de 0001_products.sql (SQL Editor → New query → Run).
-- Es idempotente: se puede volver a ejecutar.
--
-- ¿Y la contraseña?
--   NO se guarda en esta tabla. Supabase Auth la guarda en auth.users
--   cifrada con bcrypt (hash + salt). Ni tú ni nadie puede leerla: solo
--   se puede comprobar al iniciar sesión o reemplazar con "recuperar
--   contraseña". Guardarla aquí, aunque fuera cifrada, sería menos seguro.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tabla de perfiles de clientes (1 fila por usuario de auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.customers (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  -- Opcionales en la BD para que crear usuarios desde el dashboard
  -- (p. ej. el admin) no falle; la web los exige al registrarse.
  first_name  text check (first_name is null or char_length(first_name) between 1 and 60),
  last_name   text check (last_name is null or char_length(last_name) between 1 and 60),
  phone       text check (phone is null or phone ~ '^\+?[0-9]{7,15}$'),
  birth_date  date check (birth_date is null or birth_date between date '1900-01-01' and current_date),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists customers_created_at_idx on public.customers (created_at desc);

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 2. Alta automática del perfil al registrarse
--    La web envía nombre, apellido, teléfono y fecha en los metadatos
--    del registro (supabase.auth.signUp → options.data) y este trigger
--    crea la fila en public.customers.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_customer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.customers (id, email, first_name, last_name, phone, birth_date)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(trim(meta ->> 'first_name'), ''),
    nullif(trim(meta ->> 'last_name'), ''),
    nullif(meta ->> 'phone', ''),
    -- Si la fecha viene mal formada no se bloquea el registro
    case when (meta ->> 'birth_date') ~ '^\d{4}-\d{2}-\d{2}$'
         then (meta ->> 'birth_date')::date end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_customer on auth.users;
create trigger on_auth_user_created_customer
  after insert on auth.users
  for each row execute function public.handle_new_customer();

-- Mantiene el email sincronizado si el usuario lo cambia
create or replace function public.sync_customer_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.customers set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.sync_customer_email();

-- ---------------------------------------------------------------------
-- 3. Row Level Security
--    · Cada cliente ve y edita SOLO su propio perfil.
--    · Los administradores pueden ver todos los clientes.
--    · Nadie inserta ni borra desde la API (lo hace el trigger / el
--      borrado del usuario en Authentication elimina su perfil).
-- ---------------------------------------------------------------------
alter table public.customers enable row level security;

drop policy if exists "Cliente ve su perfil" on public.customers;
create policy "Cliente ve su perfil"
  on public.customers for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Admins ven clientes" on public.customers;
create policy "Admins ven clientes"
  on public.customers for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists "Cliente edita su perfil" on public.customers;
create policy "Cliente edita su perfil"
  on public.customers for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- El cliente solo puede cambiar estas columnas (no id, email ni fechas)
revoke insert, update, delete on public.customers from anon, authenticated;
grant select on public.customers to authenticated;
grant update (first_name, last_name, phone, birth_date) on public.customers to authenticated;

-- ---------------------------------------------------------------------
-- 4. Perfiles para usuarios que ya existían antes de este script
-- ---------------------------------------------------------------------
insert into public.customers (id, email)
select id, coalesce(email, '') from auth.users
on conflict (id) do nothing;
