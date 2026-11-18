-- =====================================================================
-- IQONIC WELLNESS · Tiendas replicadas / enlaces de referido
-- Ejecutar DESPUÉS de 0001 … 0004 (SQL Editor → New query → Run).
-- Es idempotente: se puede volver a ejecutar sin romper nada.
--
--   distribuidores         → perfil público del distribuidor: slug, nombre, WhatsApp
--   pedidos_referidos      → pedido atribuido (o venta directa si distribuidor_id es null)
--   create_referral_order()→ el carrito registra el pedido: crea la orden con
--                            create_order() (precios de la BD, ADR-003) y la
--                            atribuye al distribuidor del enlace
--   slug_disponible()      → ¿está libre este slug? (formulario de perfil)
--   resumen_distribuidor() → métricas del panel del distribuidor
--
-- Enlaces: https://tienda/?ref=<slug>  o  https://tienda/r/<slug>
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Distribuidores
-- ---------------------------------------------------------------------
create table if not exists public.distribuidores (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null unique references auth.users (id) on delete cascade,
  -- Minúsculas, números y guiones; sin guion al inicio/fin ni dobles ("juan-perez")
  slug           text not null unique
                 constraint distribuidores_slug_formato
                 check (slug ~ '^[a-z0-9-]+$'
                        and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
                        and char_length(slug) between 3 and 40),
  nombre_mostrar text not null
                 constraint distribuidores_nombre_largo
                 check (char_length(btrim(nombre_mostrar)) between 2 and 80),
  -- Solo dígitos con código de país (E.164 sin "+"): 5491123456789
  whatsapp       text not null
                 constraint distribuidores_whatsapp_formato
                 check (whatsapp ~ '^[0-9]{8,15}$'),
  activo         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Índice de slug: la restricción UNIQUE ya crea un índice B-tree
-- (distribuidores_slug_key) que resuelve "where slug = …". Un segundo índice
-- sería redundante. Lo mismo para user_id (distribuidores_user_id_key).

drop trigger if exists distribuidores_set_updated_at on public.distribuidores;
create trigger distribuidores_set_updated_at
  before update on public.distribuidores
  for each row execute function public.set_updated_at();

-- Solo un administrador puede activar / desactivar un distribuidor.
-- auth.uid() es null en el SQL Editor y con la clave secreta: ahí se permite.
create or replace function public.distribuidores_guard_activo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.activo is distinct from old.activo
     and (select auth.uid()) is not null
     and not (select public.is_admin()) then
    raise exception 'Solo un administrador puede activar o desactivar distribuidores'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists distribuidores_guard_activo on public.distribuidores;
create trigger distribuidores_guard_activo
  before update of activo on public.distribuidores
  for each row execute function public.distribuidores_guard_activo();

-- ---------------------------------------------------------------------
-- 2. Pedidos referidos
--    Se crean SOLO con create_referral_order() (ver sección 5): así el total
--    sale de la base de datos y nadie puede inflar las métricas de un
--    distribuidor mandando un total falso desde el navegador.
-- ---------------------------------------------------------------------
create table if not exists public.pedidos_referidos (
  id                     uuid primary key default gen_random_uuid(),
  -- null = venta directa de la tienda principal.
  -- set null: si se borra el distribuidor, la venta queda en el historial.
  distribuidor_id        uuid references public.distribuidores (id) on delete set null,
  -- Pedido del panel de administración (orders). Mismo pedido, otra vista.
  order_id               uuid unique references public.orders (id) on delete set null,
  cliente_nombre         text check (cliente_nombre is null or char_length(cliente_nombre) <= 120),
  cliente_telefono       text check (cliente_telefono is null or cliente_telefono ~ '^[0-9]{7,15}$'),
  -- [{ "id", "tipo", "nombre", "detalle", "cantidad", "precio_unitario" }, …]
  items                  jsonb not null default '[]'::jsonb
                         check (jsonb_typeof(items) = 'array'),
  total                  numeric(10, 2) not null default 0 check (total >= 0),
  moneda                 text not null default 'USD' check (moneda ~ '^[A-Z]{3}$'),
  -- Hay productos "a consultar": el total es parcial
  tiene_items_sin_precio boolean not null default false,
  estado                 text not null default 'pendiente_whatsapp'
                         check (estado in ('pendiente_whatsapp', 'confirmado', 'pagado', 'enviado',
                                           'entregado', 'cancelado', 'reembolsado')),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Panel del distribuidor: sus pedidos, del más nuevo al más viejo
create index if not exists pedidos_referidos_distribuidor_idx
  on public.pedidos_referidos (distribuidor_id, created_at desc);

drop trigger if exists pedidos_referidos_set_updated_at on public.pedidos_referidos;
create trigger pedidos_referidos_set_updated_at
  before update on public.pedidos_referidos
  for each row execute function public.set_updated_at();

-- El estado se gestiona en UN solo lugar: el panel /admin/pedidos (orders).
-- Cada cambio de orders.status se copia al pedido referido.
create or replace function public.sync_pedido_referido_estado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.pedidos_referidos
     set estado = case new.status
                    when 'pending'   then 'pendiente_whatsapp'
                    when 'confirmed' then 'confirmado'
                    when 'paid'      then 'pagado'
                    when 'shipped'   then 'enviado'
                    when 'delivered' then 'entregado'
                    when 'cancelled' then 'cancelado'
                    when 'refunded'  then 'reembolsado'
                  end
   where order_id = new.id;
  return new;
end;
$$;

drop trigger if exists orders_sync_pedido_referido on public.orders;
create trigger orders_sync_pedido_referido
  after update of status on public.orders
  for each row when (old.status is distinct from new.status)
  execute function public.sync_pedido_referido_estado();

-- ---------------------------------------------------------------------
-- 3. Row Level Security · distribuidores
--    · Cualquiera lee los distribuidores ACTIVOS (resolver ?ref=slug).
--    · Cada usuario lee su propio perfil aunque esté inactivo.
--    · INSERT / UPDATE solo sobre su propia fila (auth.uid() = user_id).
--    · Los administradores gestionan todo.
-- ---------------------------------------------------------------------
alter table public.distribuidores enable row level security;

drop policy if exists "Distribuidores activos son públicos" on public.distribuidores;
create policy "Distribuidores activos son públicos"
  on public.distribuidores for select
  to anon, authenticated
  using (activo = true);

drop policy if exists "Distribuidor ve su perfil" on public.distribuidores;
create policy "Distribuidor ve su perfil"
  on public.distribuidores for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Distribuidor crea su perfil" on public.distribuidores;
create policy "Distribuidor crea su perfil"
  on public.distribuidores for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Distribuidor edita su perfil" on public.distribuidores;
create policy "Distribuidor edita su perfil"
  on public.distribuidores for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Admins gestionan distribuidores" on public.distribuidores;
create policy "Admins gestionan distribuidores"
  on public.distribuidores for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Privilegios por columna:
--   · anon no ve user_id (no hace falta para resolver un enlace).
--   · Nadie cambia user_id, id ni fechas; "activo" lo protege el trigger.
revoke all on public.distribuidores from anon, authenticated;
grant select (id, slug, nombre_mostrar, whatsapp, activo) on public.distribuidores to anon;
grant select on public.distribuidores to authenticated;
grant insert (user_id, slug, nombre_mostrar, whatsapp) on public.distribuidores to authenticated;
grant update (slug, nombre_mostrar, whatsapp, activo) on public.distribuidores to authenticated;
grant delete on public.distribuidores to authenticated; -- solo admins (no hay política para el dueño)

-- ---------------------------------------------------------------------
-- 4. Row Level Security · pedidos_referidos
--    · El distribuidor lee SOLO los pedidos atribuidos a él.
--    · Los administradores gestionan todo.
--    · INSERT público a través de create_referral_order() (SECURITY DEFINER),
--      igual que orders/create_order(): sin INSERT directo desde la API.
-- ---------------------------------------------------------------------
alter table public.pedidos_referidos enable row level security;

drop policy if exists "Distribuidor lee sus pedidos referidos" on public.pedidos_referidos;
create policy "Distribuidor lee sus pedidos referidos"
  on public.pedidos_referidos for select
  to authenticated
  using (exists (
    select 1 from public.distribuidores d
    where d.id = distribuidor_id and d.user_id = (select auth.uid())
  ));

drop policy if exists "Admins gestionan pedidos referidos" on public.pedidos_referidos;
create policy "Admins gestionan pedidos referidos"
  on public.pedidos_referidos for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

revoke all on public.pedidos_referidos from anon, authenticated;
grant select, update, delete on public.pedidos_referidos to authenticated; -- update/delete: solo admins (RLS)

-- ---------------------------------------------------------------------
-- 5. Registrar un pedido desde el carrito (anon y authenticated)
--
--    p_items            → [{ "kind": "product" | "package", "id": "<uuid>", "quantity": 2 }, …]
--    p_ref_slug         → slug de la cookie iqonic_ref (null = venta directa)
--    p_cliente_nombre   → nombre que escribió el comprador (opcional)
--    p_cliente_telefono → teléfono (opcional; se guardan solo los dígitos)
--    p_note, p_currency → igual que create_order()
--
--    · Reutiliza create_order(): precios y total salen de la BD, el pedido
--      aparece en /admin/pedidos y queda vinculado al cliente si hay sesión.
--    · Si el slug no existe o el distribuidor está inactivo, NO falla:
--      se registra como venta directa (distribuidor = null).
--    · Todo en una transacción.
--    Devuelve lo mismo que create_order() + pedido_referido_id + distribuidor.
-- ---------------------------------------------------------------------
create or replace function public.create_referral_order(
  p_items            jsonb,
  p_ref_slug         text default null,
  p_cliente_nombre   text default null,
  p_cliente_telefono text default null,
  p_note             text default null,
  p_currency         text default 'USD'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slug       text := nullif(lower(btrim(coalesce(p_ref_slug, ''))), '');
  v_nombre     text := nullif(btrim(coalesce(p_cliente_nombre, '')), '');
  v_telefono   text := nullif(regexp_replace(coalesce(p_cliente_telefono, ''), '\D', '', 'g'), '');
  v_dist       public.distribuidores%rowtype;
  v_order      jsonb;
  v_order_id   uuid;
  v_pedido_id  uuid;
begin
  if v_nombre is not null and char_length(v_nombre) > 120 then
    raise exception 'El nombre es demasiado largo' using errcode = '22023';
  end if;
  if v_telefono is not null and v_telefono !~ '^[0-9]{7,15}$' then
    raise exception 'Teléfono inválido' using errcode = '22023';
  end if;

  if v_slug is not null then
    select * into v_dist
      from public.distribuidores
     where slug = v_slug and activo;
  end if;

  -- Valida items, precios y totales; lanza P0002 si algo ya no está disponible
  v_order    := public.create_order(p_items, p_note, 'whatsapp', p_currency);
  v_order_id := (v_order ->> 'id')::uuid;

  insert into public.pedidos_referidos
    (distribuidor_id, order_id, cliente_nombre, cliente_telefono, items, total, moneda, tiene_items_sin_precio)
  values (
    v_dist.id,
    v_order_id,
    coalesce(v_nombre, v_order ->> 'contact_name'),
    v_telefono,
    (select coalesce(jsonb_agg(jsonb_build_object(
              'id',              coalesce(oi.product_id, oi.package_id),
              'tipo',            oi.kind,
              'nombre',          oi.name,
              'detalle',         oi.detail,
              'cantidad',        oi.quantity,
              'precio_unitario', oi.unit_price
            ) order by oi.sort_order), '[]'::jsonb)
       from public.order_items oi
      where oi.order_id = v_order_id),
    (v_order ->> 'total')::numeric,
    v_order ->> 'currency',
    coalesce((v_order ->> 'has_unpriced_items')::boolean, false)
  )
  returning id into v_pedido_id;

  return v_order || jsonb_build_object(
    'pedido_referido_id', v_pedido_id,
    'distribuidor', case when v_dist.id is null then null else jsonb_build_object(
      'id',             v_dist.id,
      'slug',           v_dist.slug,
      'nombre_mostrar', v_dist.nombre_mostrar,
      'whatsapp',       v_dist.whatsapp
    ) end
  );
end;
$$;

revoke all on function public.create_referral_order(jsonb, text, text, text, text, text) from public;
grant execute on function public.create_referral_order(jsonb, text, text, text, text, text)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 6. ¿Slug disponible?
--    SECURITY DEFINER: ve también los slugs de distribuidores INACTIVOS
--    (que RLS oculta) y así el formulario no promete un slug ocupado.
--    El slug del propio usuario cuenta como disponible.
-- ---------------------------------------------------------------------
create or replace function public.slug_disponible(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.distribuidores
    where slug = lower(btrim(p_slug))
      and user_id is distinct from (select auth.uid())
  );
$$;

revoke all on function public.slug_disponible(text) from public, anon;
grant execute on function public.slug_disponible(text) to authenticated;

-- ---------------------------------------------------------------------
-- 7. Métricas del distribuidor autenticado
--    SECURITY INVOKER: RLS limita el cálculo a SUS pedidos.
--    "Concretado" = pagado, enviado o entregado.
-- ---------------------------------------------------------------------
create or replace function public.resumen_distribuidor()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with mis_pedidos as (
    select pr.*
      from public.pedidos_referidos pr
      join public.distribuidores d on d.id = pr.distribuidor_id
     where d.user_id = (select auth.uid())
  )
  select jsonb_build_object(
    'total_pedidos',      count(*),
    'pedidos_concretados', count(*) filter (where estado in ('pagado', 'enviado', 'entregado')),
    'monto_total',        coalesce(sum(total) filter (where estado not in ('cancelado', 'reembolsado')), 0),
    'monto_concretado',   coalesce(sum(total) filter (where estado in ('pagado', 'enviado', 'entregado')), 0),
    'ultimo_pedido_at',   max(created_at),
    'por_estado', coalesce(
      (select jsonb_object_agg(estado, n)
         from (select estado, count(*) as n from mis_pedidos group by estado) e),
      '{}'::jsonb)
  )
  from mis_pedidos;
$$;

revoke all on function public.resumen_distribuidor() from public, anon;
grant execute on function public.resumen_distribuidor() to authenticated;
