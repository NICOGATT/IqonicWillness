-- =====================================================================
-- IQONIC WELLNESS · Roles (admin / distributor / client) + atribución por iqonic_id
-- Ejecutar DESPUÉS de 0001 … 0005 (SQL Editor → New query → Run).
-- Es idempotente: se puede volver a ejecutar sin romper nada.
--
-- La tabla de perfiles del proyecto es public.customers (1 fila por usuario
-- de auth.users, creada por el trigger on_auth_user_created_customer). Este
-- script la extiende en lugar de crear una tabla "profiles" paralela:
--
--   role                   'admin' | 'distributor' | 'client'
--   iqonic_id              ID de distribuidor de IQONIC (único). Obligatorio si
--                          role = 'distributor', NULL si role = 'client'.
--   referred_by_iqonic_id  iqonic_id del distribuidor que trajo al usuario
--                          (FK → customers.iqonic_id; NULL = tráfico orgánico)
--   whatsapp               solo dígitos con código de país (5491123456789)
--   full_name              "Nombre Apellido" (se mantiene solo desde first/last)
--
--   iqonic_id_disponible() → ¿ya existe este iqonic_id? (registro en vivo)
--   distribuidor_publico() → full_name, iqonic_id y whatsapp de un distribuidor
--                            a partir de su iqonic_id o del slug de su tienda
--
-- El rol "admin" refleja la tabla public.admins (fuente de verdad de
-- is_admin()): un trigger lo mantiene sincronizado.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Columnas nuevas
-- ---------------------------------------------------------------------
alter table public.customers
  add column if not exists role                  text not null default 'client',
  add column if not exists iqonic_id             text,
  add column if not exists referred_by_iqonic_id text,
  add column if not exists whatsapp              text,
  add column if not exists full_name             text;

-- ---------------------------------------------------------------------
-- 2. Normalización del iqonic_id: sin espacios a los lados y en mayúsculas,
--    así "ab123" y "AB123 " son el mismo ID para la restricción UNIQUE.
-- ---------------------------------------------------------------------
create or replace function public.normalize_iqonic_id(p_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(upper(btrim(coalesce(p_value, ''))), '');
$$;

-- Backfill de full_name ANTES de los CHECK (los perfiles viejos no lo tienen)
update public.customers
   set full_name = nullif(btrim(concat_ws(' ', btrim(first_name), btrim(last_name))), '')
 where full_name is null
   and (first_name is not null or last_name is not null);

-- ---------------------------------------------------------------------
-- 3. Restricciones
-- ---------------------------------------------------------------------
alter table public.customers drop constraint if exists customers_role_check;
alter table public.customers add constraint customers_role_check
  check (role in ('admin', 'distributor', 'client'));

-- Letras, números, guion y guion bajo (ajústalo si los IDs de IQONIC tienen otro formato)
alter table public.customers drop constraint if exists customers_iqonic_id_formato;
alter table public.customers add constraint customers_iqonic_id_formato
  check (iqonic_id is null or iqonic_id ~ '^[A-Z0-9_-]{3,40}$');

-- La regla central: ningún distribuidor sin iqonic_id; ningún cliente con uno.
-- (Un admin puede tenerlo o no: p. ej. un admin que además es distribuidor.)
alter table public.customers drop constraint if exists customers_iqonic_id_por_rol;
alter table public.customers add constraint customers_iqonic_id_por_rol
  check (
    (role <> 'distributor' or iqonic_id is not null)
    and (role <> 'client' or iqonic_id is null)
  );

alter table public.customers drop constraint if exists customers_whatsapp_formato;
alter table public.customers add constraint customers_whatsapp_formato
  check (whatsapp is null or whatsapp ~ '^[0-9]{8,15}$');

alter table public.customers drop constraint if exists customers_full_name_largo;
alter table public.customers add constraint customers_full_name_largo
  check (full_name is null or char_length(btrim(full_name)) between 1 and 121);

alter table public.customers drop constraint if exists customers_sin_autorreferido;
alter table public.customers add constraint customers_sin_autorreferido
  check (referred_by_iqonic_id is null or iqonic_id is null or referred_by_iqonic_id <> iqonic_id);

-- UNIQUE + FK: se crean solo si no existen (la FK depende del UNIQUE, así que
-- no se pueden "drop + add" en cada ejecución).
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'customers_iqonic_id_key' and conrelid = 'public.customers'::regclass
  ) then
    alter table public.customers add constraint customers_iqonic_id_key unique (iqonic_id);
  end if;

  if not exists (
    select 1 from pg_constraint
     where conname = 'customers_referred_by_fkey' and conrelid = 'public.customers'::regclass
  ) then
    -- on update cascade: si un admin corrige un iqonic_id, sus referidos lo siguen.
    -- on delete set null: si se borra el distribuidor, el cliente queda orgánico.
    alter table public.customers add constraint customers_referred_by_fkey
      foreign key (referred_by_iqonic_id) references public.customers (iqonic_id)
      on update cascade on delete set null;
  end if;
end;
$$;

-- Panel del distribuidor: "mis referidos, del más nuevo al más viejo"
create index if not exists customers_referred_by_idx
  on public.customers (referred_by_iqonic_id, created_at desc)
  where referred_by_iqonic_id is not null;

-- ---------------------------------------------------------------------
-- 4. Normalización + protección de columnas sensibles
--    · iqonic_id / referred_by_iqonic_id siempre normalizados.
--    · full_name se recalcula cuando cambian nombre o apellido.
--    · role, iqonic_id y referred_by_iqonic_id solo los cambia un admin
--      (o el SQL Editor / la clave secreta, donde auth.uid() es null).
-- ---------------------------------------------------------------------
create or replace function public.customers_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.iqonic_id             := public.normalize_iqonic_id(new.iqonic_id);
  new.referred_by_iqonic_id := public.normalize_iqonic_id(new.referred_by_iqonic_id);

  -- IF anidados a propósito: OLD no existe en un INSERT y SQL no garantiza
  -- que OR / AND evalúen en orden.
  if tg_op = 'INSERT' then
    new.full_name := coalesce(
      nullif(btrim(concat_ws(' ', btrim(new.first_name), btrim(new.last_name))), ''),
      new.full_name
    );
    return new;
  end if;

  if new.first_name is distinct from old.first_name
     or new.last_name is distinct from old.last_name then
    new.full_name := coalesce(
      nullif(btrim(concat_ws(' ', btrim(new.first_name), btrim(new.last_name))), ''),
      new.full_name
    );
  end if;

  if (new.role, new.iqonic_id, new.referred_by_iqonic_id)
     is distinct from (old.role, old.iqonic_id, old.referred_by_iqonic_id) then
    -- auth.uid() es null en el SQL Editor, con la clave secreta y en las
    -- cascadas que dispara Supabase Auth: ahí se permite.
    if (select auth.uid()) is not null then
      if not (select public.is_admin()) then
        raise exception 'Solo un administrador puede cambiar el rol, el iqonic_id o el patrocinador'
          using errcode = '42501';
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists customers_before_write on public.customers;
create trigger customers_before_write
  before insert or update on public.customers
  for each row execute function public.customers_before_write();

-- ---------------------------------------------------------------------
-- 5. Alta automática del perfil (reemplaza la versión de 0002)
--    Trigger: on_auth_user_created_customer (after insert on auth.users).
--
--    ⚠️ raw_user_meta_data lo controla el usuario: cualquiera puede llamar a
--    supabase.auth.signUp() con la clave pública y metadatos inventados. Por eso:
--      · "admin" NUNCA se acepta desde el registro (se degrada a "client").
--      · "distributor" sin iqonic_id → error: el registro se cancela entero.
--      · iqonic_id repetido → error UNIQUE: el registro se cancela entero.
--      · referred_by_iqonic_id que no sea de un distribuidor → se ignora (NULL).
-- ---------------------------------------------------------------------
create or replace function public.handle_new_customer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta       jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role     text  := lower(btrim(coalesce(meta ->> 'role', 'client')));
  v_iqonic   text  := public.normalize_iqonic_id(meta ->> 'iqonic_id');
  v_ref      text  := public.normalize_iqonic_id(meta ->> 'referred_by_iqonic_id');
  v_whatsapp text  := nullif(regexp_replace(coalesce(meta ->> 'whatsapp', ''), '\D', '', 'g'), '');
  v_first    text  := nullif(btrim(meta ->> 'first_name'), '');
  v_last     text  := nullif(btrim(meta ->> 'last_name'), '');
  v_full     text  := nullif(btrim(meta ->> 'full_name'), '');
begin
  if v_role not in ('distributor', 'client') then
    v_role := 'client';
  end if;

  if v_role = 'client' then
    v_iqonic := null;
  elsif v_iqonic is null then
    raise exception 'Un distribuidor necesita su iqonic_id para registrarse'
      using errcode = '23514';
  end if;

  -- El patrocinador tiene que ser un distribuidor existente (y no uno mismo)
  if v_ref is not null then
    select c.iqonic_id into v_ref
      from public.customers c
     where c.iqonic_id = v_ref and c.role = 'distributor';
    if v_ref = v_iqonic then
      v_ref := null;
    end if;
  end if;

  -- WhatsApp mal formado: no bloquea el registro, se guarda vacío
  if v_whatsapp is not null and v_whatsapp !~ '^[0-9]{8,15}$' then
    v_whatsapp := null;
  end if;

  insert into public.customers
    (id, email, first_name, last_name, phone, birth_date,
     role, iqonic_id, referred_by_iqonic_id, whatsapp, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    v_first,
    v_last,
    nullif(meta ->> 'phone', ''),
    -- Si la fecha viene mal formada no se bloquea el registro
    case when (meta ->> 'birth_date') ~ '^\d{4}-\d{2}-\d{2}$'
         then (meta ->> 'birth_date')::date end,
    v_role,
    v_iqonic,
    v_ref,
    v_whatsapp,
    -- customers_before_write() lo recalcula desde nombre + apellido si los hay
    left(v_full, 121)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- El trigger ya existe desde 0002; se recrea por si se ejecuta este script solo
drop trigger if exists on_auth_user_created_customer on auth.users;
create trigger on_auth_user_created_customer
  after insert on auth.users
  for each row execute function public.handle_new_customer();

-- ---------------------------------------------------------------------
-- 6. role = 'admin' refleja la tabla public.admins
--    Al quitar un admin vuelve a "distributor" si tiene iqonic_id, o a "client".
-- ---------------------------------------------------------------------
create or replace function public.sync_admin_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.customers set role = 'admin' where id = new.user_id;
    return new;
  end if;

  update public.customers
     set role = case when iqonic_id is not null then 'distributor' else 'client' end
   where id = old.user_id and role = 'admin';
  return old;
end;
$$;

drop trigger if exists admins_sync_role on public.admins;
create trigger admins_sync_role
  after insert or delete on public.admins
  for each row execute function public.sync_admin_role();

-- Admins que ya existían
update public.customers c
   set role = 'admin'
  from public.admins a
 where a.user_id = c.id and c.role <> 'admin';

-- ---------------------------------------------------------------------
-- 7. iqonic_id del distribuidor que hace la petición
--    SECURITY DEFINER: una política de customers no puede consultar customers
--    (recursión infinita de RLS); esta función lee la fila sin pasar por RLS.
-- ---------------------------------------------------------------------
create or replace function public.current_distributor_iqonic_id()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select iqonic_id
    from public.customers
   where id = (select auth.uid()) and role = 'distributor';
$$;

revoke all on function public.current_distributor_iqonic_id() from public, anon;
grant execute on function public.current_distributor_iqonic_id() to authenticated;

-- ---------------------------------------------------------------------
-- 8. Row Level Security · customers
--    · Cada usuario ve y edita SOLO su propio perfil          (0002, se mantiene)
--    · Un distribuidor además VE (no edita) a quienes tienen
--      referred_by_iqonic_id = su iqonic_id. Nada más: ni los clientes ni los
--      datos de otros distribuidores.
--    · Los administradores ven, editan y borran todo.
-- ---------------------------------------------------------------------
alter table public.customers enable row level security;

drop policy if exists "Distribuidor ve sus referidos" on public.customers;
create policy "Distribuidor ve sus referidos"
  on public.customers for select
  to authenticated
  using (
    referred_by_iqonic_id is not null
    and referred_by_iqonic_id = (select public.current_distributor_iqonic_id())
  );

-- Reemplaza "Admins ven clientes" (solo SELECT) por acceso completo
drop policy if exists "Admins ven clientes" on public.customers;
drop policy if exists "Admins gestionan clientes" on public.customers;
create policy "Admins gestionan clientes"
  on public.customers for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Privilegios por columna. role / iqonic_id / referred_by_iqonic_id se
-- conceden para que un admin pueda cambiarlos desde la API; al resto se lo
-- impide customers_before_write(). id, email y fechas no los cambia nadie.
revoke insert, update, delete on public.customers from anon, authenticated;
grant select on public.customers to authenticated;
grant update (first_name, last_name, phone, birth_date, whatsapp, full_name,
              role, iqonic_id, referred_by_iqonic_id)
  on public.customers to authenticated;
grant delete on public.customers to authenticated; -- solo admins (RLS)

-- ---------------------------------------------------------------------
-- 9. ¿iqonic_id disponible? (formulario de registro, antes de tener sesión)
--    SECURITY DEFINER: ve todos los perfiles sin exponer ninguno; solo
--    responde true / false. No revela más que distribuidor_publico().
-- ---------------------------------------------------------------------
create or replace function public.iqonic_id_disponible(p_iqonic_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.normalize_iqonic_id(p_iqonic_id) is not null
     and not exists (
       select 1 from public.customers
        where iqonic_id = public.normalize_iqonic_id(p_iqonic_id)
     );
$$;

revoke all on function public.iqonic_id_disponible(text) from public;
grant execute on function public.iqonic_id_disponible(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 10. Datos públicos de un distribuidor (landing de referido + botón WhatsApp)
--     p_ref = iqonic_id ("AB123") o slug de su tienda ("juan-perez").
--     Devuelve SOLO full_name, iqonic_id y whatsapp; nunca email, teléfono,
--     fecha de nacimiento ni sus clientes. Si tiene tienda y está pausada,
--     no devuelve nada. El nombre y el WhatsApp del perfil tienen prioridad;
--     si faltan, se usan los de su tienda (distribuidores).
-- ---------------------------------------------------------------------
create or replace function public.distribuidor_publico(p_ref text)
returns table (full_name text, iqonic_id text, whatsapp text)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(btrim(c.full_name), ''), d.nombre_mostrar),
         c.iqonic_id,
         coalesce(c.whatsapp, d.whatsapp)
    from public.customers c
    left join public.distribuidores d on d.user_id = c.id
   where c.role = 'distributor'
     and nullif(btrim(coalesce(p_ref, '')), '') is not null
     and (c.iqonic_id = public.normalize_iqonic_id(p_ref)
          or d.slug = lower(btrim(p_ref)))
     and coalesce(d.activo, true)
   -- Si p_ref coincide con el iqonic_id de uno y el slug de otro, gana el iqonic_id
   order by (c.iqonic_id = public.normalize_iqonic_id(p_ref)) desc
   limit 1;
$$;

revoke all on function public.distribuidor_publico(text) from public;
grant execute on function public.distribuidor_publico(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 11. Convertir manualmente a alguien en distribuidor (SQL Editor):
--
--   update public.customers
--      set role = 'distributor', iqonic_id = 'AB123'
--    where email = 'persona@correo.com';
-- ---------------------------------------------------------------------
