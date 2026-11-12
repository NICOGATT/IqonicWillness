-- =====================================================================
-- IQONIC WELLNESS · Esquema de productos + seguridad (RLS)
-- Ejecutar en Supabase → SQL Editor → New query → Run.
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Administradores
--    Solo los usuarios listados aquí pueden modificar el catálogo.
--    (Más seguro que "cualquier usuario autenticado": si alguien logra
--    registrarse en tu proyecto, igualmente no podrá editar productos.)
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
-- Sin políticas: nadie lee ni escribe esta tabla desde la API.
-- Se gestiona desde el SQL Editor (ver paso 4 de SUPABASE.md).

-- ¿El usuario de la petición actual es administrador?
-- SECURITY DEFINER permite consultar public.admins aunque tenga RLS cerrado.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------
-- 2. Productos
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique
                      check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name                text not null check (char_length(name) between 2 and 80),
  description         text,
  type                text not null,                       -- "Wellness Support Gummies"
  badge               text,                                -- "Daily Gummies"
  category            text not null
                      check (category in ('gummies', 'energy', 'hydration')),
  flavor              text not null,                       -- "Mango"
  presentation_label  text not null,                       -- "60 Gummies"
  presentation_detail text,                                -- "Dietary Supplement"
  -- Beneficios: [{ "icon": "shield", "label": "Apoyo inmune" }, ...]
  benefits            jsonb not null default '[]'::jsonb
                      check (jsonb_typeof(benefits) = 'array'),
  price               numeric(10, 2) check (price is null or price >= 0),
  image_url           text,
  accent_from         text not null default '#FFA51F'
                      check (accent_from ~ '^#[0-9A-Fa-f]{6}$'),
  accent_to           text not null default '#FF7A1A'
                      check (accent_to ~ '^#[0-9A-Fa-f]{6}$'),
  -- Datos para la ilustración del envase cuando no hay foto (opcional)
  packaging           jsonb,
  featured            boolean not null default false,      -- aparece en el hero
  is_active           boolean not null default true,       -- visible en la tienda
  sort_order          integer not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists products_active_sort_idx
  on public.products (is_active, sort_order, created_at);

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 3. Row Level Security
--    · Cualquiera (anon) lee los productos activos.
--    · Los administradores leen todos y pueden crear, editar y eliminar.
-- ---------------------------------------------------------------------
alter table public.products enable row level security;

drop policy if exists "Productos activos son públicos" on public.products;
create policy "Productos activos son públicos"
  on public.products for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "Admins leen todo" on public.products;
create policy "Admins leen todo"
  on public.products for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists "Admins crean productos" on public.products;
create policy "Admins crean productos"
  on public.products for insert
  to authenticated
  with check ((select public.is_admin()));

drop policy if exists "Admins editan productos" on public.products;
create policy "Admins editan productos"
  on public.products for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins eliminan productos" on public.products;
create policy "Admins eliminan productos"
  on public.products for delete
  to authenticated
  using ((select public.is_admin()));
