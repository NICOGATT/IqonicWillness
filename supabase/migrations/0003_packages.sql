-- =====================================================================
-- IQONIC WELLNESS · Paquetes (packs / combos de productos)
-- Ejecutar DESPUÉS de 0001_products.sql (SQL Editor → New query → Run).
-- Es idempotente: se puede volver a ejecutar sin romper nada.
--
--   packages       → el paquete: nombre, precio, descripción, imagen…
--   package_items  → lo que contiene: qué productos y cuántos de cada uno
--   packages_with_items (vista) → todo junto, listo para mostrar
--   admin_save_package()        → el panel guarda paquete + contenido de una vez
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Paquetes
-- ---------------------------------------------------------------------
create table if not exists public.packages (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique
              check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name        text not null check (char_length(name) between 2 and 80),   -- "Pack Energía Total"
  description text check (description is null or char_length(description) <= 400),
  badge       text check (badge is null or char_length(badge) <= 40),     -- "Ahorra 15%"
  -- Precio del paquete completo (misma moneda que products.price)
  price       numeric(10, 2) not null check (price >= 0),
  image_url   text check (image_url is null or image_url ~ '^https://'),
  featured    boolean not null default false,
  is_active   boolean not null default true,                              -- visible en la tienda
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists packages_active_sort_idx
  on public.packages (is_active, sort_order, created_at);

drop trigger if exists packages_set_updated_at on public.packages;
create trigger packages_set_updated_at
  before update on public.packages
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 2. Contenido de cada paquete
--    Un producto aparece una sola vez por paquete, con su cantidad.
--    No se puede borrar un producto que esté dentro de algún paquete
--    (on delete restrict): primero hay que quitarlo del paquete.
-- ---------------------------------------------------------------------
create table if not exists public.package_items (
  package_id  uuid not null references public.packages (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete restrict,
  quantity    integer not null default 1 check (quantity between 1 and 20),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  primary key (package_id, product_id)
);

create index if not exists package_items_product_idx on public.package_items (product_id);

-- ---------------------------------------------------------------------
-- 3. Row Level Security
--    · Cualquiera lee los paquetes activos y su contenido.
--    · Los administradores leen todo y pueden crear, editar y eliminar.
-- ---------------------------------------------------------------------
alter table public.packages enable row level security;
alter table public.package_items enable row level security;

drop policy if exists "Paquetes activos son públicos" on public.packages;
create policy "Paquetes activos son públicos"
  on public.packages for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "Admins gestionan paquetes" on public.packages;
create policy "Admins gestionan paquetes"
  on public.packages for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Contenido de paquetes activos es público" on public.package_items;
create policy "Contenido de paquetes activos es público"
  on public.package_items for select
  to anon, authenticated
  using (exists (
    select 1 from public.packages p
    where p.id = package_id and p.is_active = true
  ));

drop policy if exists "Admins gestionan contenido de paquetes" on public.package_items;
create policy "Admins gestionan contenido de paquetes"
  on public.package_items for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- 4. Vista: paquete + contenido + precio por separado
--    security_invoker = respeta el RLS de quien consulta (un visitante
--    solo ve paquetes activos y productos activos).
--
--    items          → [{ product_id, slug, name, flavor, quantity, unit_price }, ...]
--    regular_price  → lo que costaría comprar cada producto por separado
--                     (null si algún producto no tiene precio)
--    savings        → regular_price − price
-- ---------------------------------------------------------------------
drop view if exists public.packages_with_items;
create view public.packages_with_items
with (security_invoker = true)
as
select
  pk.*,
  coalesce(c.items, '[]'::jsonb)   as items,
  c.item_count,
  c.regular_price,
  case when c.regular_price is not null then c.regular_price - pk.price end as savings
from public.packages pk
left join lateral (
  select
    jsonb_agg(
      jsonb_build_object(
        'product_id', pr.id,
        'slug',       pr.slug,
        'name',       pr.name,
        'flavor',     pr.flavor,
        'quantity',   pi.quantity,
        'unit_price', pr.price
      )
      order by pi.sort_order, pr.name
    )                                              as items,
    sum(pi.quantity)::int                          as item_count,
    -- sum() ignora nulls: si falta algún precio, regular_price queda en null
    case when bool_and(pr.price is not null)
         then sum(pr.price * pi.quantity) end      as regular_price
  from public.package_items pi
  join public.products pr on pr.id = pi.product_id
  where pi.package_id = pk.id
) c on true;

grant select on public.packages_with_items to anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Guardar paquete + contenido en una sola operación (panel /admin)
--    Todo ocurre en una transacción: si algo falla no queda un paquete
--    a medias. SECURITY INVOKER: además del chequeo de admin, aplica RLS.
--
--    p_package → { id?, slug, name, description, badge, price, image_url,
--                  featured, is_active, sort_order }   (sin id = crear)
--    p_items   → [{ product_id, quantity }, ...]       (al menos uno)
--    Devuelve el id del paquete.
-- ---------------------------------------------------------------------
create or replace function public.admin_save_package(p_package jsonb, p_items jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := nullif(p_package ->> 'id', '')::uuid;
begin
  if not (select public.is_admin()) then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El paquete necesita al menos un producto' using errcode = '22023';
  end if;

  if v_id is null then
    insert into public.packages
      (slug, name, description, badge, price, image_url, featured, is_active, sort_order)
    values (
      p_package ->> 'slug',
      p_package ->> 'name',
      p_package ->> 'description',
      p_package ->> 'badge',
      (p_package ->> 'price')::numeric,
      p_package ->> 'image_url',
      coalesce((p_package ->> 'featured')::boolean, false),
      coalesce((p_package ->> 'is_active')::boolean, true),
      coalesce((p_package ->> 'sort_order')::integer, 0)
    )
    returning id into v_id;
  else
    update public.packages set
      slug        = p_package ->> 'slug',
      name        = p_package ->> 'name',
      description = p_package ->> 'description',
      badge       = p_package ->> 'badge',
      price       = (p_package ->> 'price')::numeric,
      image_url   = p_package ->> 'image_url',
      featured    = coalesce((p_package ->> 'featured')::boolean, false),
      is_active   = coalesce((p_package ->> 'is_active')::boolean, true),
      sort_order  = coalesce((p_package ->> 'sort_order')::integer, 0)
    where id = v_id
    returning id into v_id;

    if v_id is null then
      raise exception 'Paquete no encontrado' using errcode = 'P0002';
    end if;

    delete from public.package_items where package_id = v_id;
  end if;

  insert into public.package_items (package_id, product_id, quantity, sort_order)
  select v_id, (item ->> 'product_id')::uuid, (item ->> 'quantity')::integer, position::integer
  from jsonb_array_elements(p_items) with ordinality as t(item, position);

  return v_id;
end;
$$;

revoke all on function public.admin_save_package(jsonb, jsonb) from public, anon;
grant execute on function public.admin_save_package(jsonb, jsonb) to authenticated;
