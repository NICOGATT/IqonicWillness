-- =====================================================================
-- IQONIC WELLNESS · Pedidos y pagos
-- Ejecutar DESPUÉS de 0001, 0002 y 0003 (SQL Editor → New query → Run).
-- Es idempotente: se puede volver a ejecutar sin romper nada.
--
--   orders        → el pedido: número, cliente, estado, canal, totales
--   order_items   → qué se pidió (copia de nombre y precio al momento)
--   payments      → cobros (Stripe, Mercado Pago, efectivo…). Lo llenará
--                   el webhook de Stripe en el siguiente paso.
--   create_order()→ la tienda crea el pedido: lee los precios de la BD
--                   (nunca del navegador) y calcula el total.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Pedidos
-- ---------------------------------------------------------------------
create table if not exists public.orders (
  id                 uuid primary key default gen_random_uuid(),
  -- Número legible para hablar con el cliente: #1001, #1002…
  number             bigint generated always as identity (start with 1001) unique,
  -- null = compró sin cuenta
  customer_id        uuid references public.customers (id) on delete set null,
  -- Copia de los datos de contacto al momento del pedido
  contact_name       text check (contact_name is null or char_length(contact_name) <= 120),
  contact_email      text check (contact_email is null or char_length(contact_email) <= 254),
  contact_phone      text check (contact_phone is null or char_length(contact_phone) <= 30),
  status             text not null default 'pending'
                     check (status in ('pending', 'confirmed', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded')),
  channel            text not null default 'whatsapp'
                     check (channel in ('whatsapp', 'stripe', 'mercadopago', 'manual')),
  currency           text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  subtotal           numeric(12, 2) not null default 0 check (subtotal >= 0),
  shipping           numeric(12, 2) not null default 0 check (shipping >= 0),
  total              numeric(12, 2) not null default 0 check (total >= 0),
  -- Hay productos sin precio ("a consultar"): el total es parcial
  has_unpriced_items boolean not null default false,
  -- Comentario que escribió el cliente en el carrito
  customer_note      text check (customer_note is null or char_length(customer_note) <= 500),
  -- Notas internas del equipo (no las ve el cliente)
  admin_notes        text check (admin_notes is null or char_length(admin_notes) <= 2000),
  shipping_address   jsonb,
  paid_at            timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_customer_idx on public.orders (customer_id);
create index if not exists orders_status_idx on public.orders (status);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- Guarda la fecha de pago la primera vez que el pedido pasa a "paid"
create or replace function public.orders_track_paid_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'paid' and new.paid_at is null then
    new.paid_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists orders_track_paid_at on public.orders;
create trigger orders_track_paid_at
  before insert or update of status on public.orders
  for each row execute function public.orders_track_paid_at();

-- ---------------------------------------------------------------------
-- 2. Líneas del pedido
--    Nombre, detalle y precio son una COPIA: si mañana cambia el precio
--    o se borra el producto, el pedido sigue mostrando lo que se vendió.
-- ---------------------------------------------------------------------
create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  kind        text not null check (kind in ('product', 'package')),
  product_id  uuid references public.products (id) on delete set null,
  package_id  uuid references public.packages (id) on delete set null,
  name        text not null,
  -- Sabor (producto) o contenido (paquete)
  detail      text,
  -- null = precio a consultar
  unit_price  numeric(12, 2) check (unit_price is null or unit_price >= 0),
  quantity    integer not null check (quantity between 1 and 99),
  line_total  numeric(12, 2) generated always as (unit_price * quantity) stored,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  -- Un producto no lleva package_id y viceversa (ambos pueden quedar en null si se borran)
  check (not (kind = 'product' and package_id is not null)),
  check (not (kind = 'package' and product_id is not null))
);

create index if not exists order_items_order_idx on public.order_items (order_id, sort_order);
create index if not exists order_items_product_idx on public.order_items (product_id);
create index if not exists order_items_package_idx on public.order_items (package_id);

-- ---------------------------------------------------------------------
-- 3. Pagos
--    Los crea el webhook de Stripe / Mercado Pago (con la clave de
--    servicio, que salta RLS) o el admin para efectivo y transferencia.
-- ---------------------------------------------------------------------
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references public.orders (id) on delete cascade,
  provider            text not null check (provider in ('stripe', 'mercadopago', 'cash', 'transfer')),
  -- cs_… / pi_… de Stripe, id de Mercado Pago. Único: el webhook puede llegar dos veces.
  provider_payment_id text unique,
  status              text not null default 'pending'
                      check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  amount              numeric(12, 2) not null check (amount >= 0),
  currency            text not null check (currency ~ '^[A-Z]{3}$'),
  -- Evento original del proveedor (auditoría)
  raw                 jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists payments_order_idx on public.payments (order_id);

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 4. Row Level Security
--    · El cliente con cuenta lee SUS pedidos, líneas y pagos.
--    · Los administradores leen y gestionan todo.
--    · Nadie inserta pedidos directamente: se crean con create_order().
-- ---------------------------------------------------------------------
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;

drop policy if exists "Clientes leen sus pedidos" on public.orders;
create policy "Clientes leen sus pedidos"
  on public.orders for select
  to authenticated
  using (customer_id = (select auth.uid()));

drop policy if exists "Admins gestionan pedidos" on public.orders;
create policy "Admins gestionan pedidos"
  on public.orders for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Clientes leen las líneas de sus pedidos" on public.order_items;
create policy "Clientes leen las líneas de sus pedidos"
  on public.order_items for select
  to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and o.customer_id = (select auth.uid())
  ));

drop policy if exists "Admins gestionan líneas de pedidos" on public.order_items;
create policy "Admins gestionan líneas de pedidos"
  on public.order_items for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Clientes leen los pagos de sus pedidos" on public.payments;
create policy "Clientes leen los pagos de sus pedidos"
  on public.payments for select
  to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and o.customer_id = (select auth.uid())
  ));

drop policy if exists "Admins gestionan pagos" on public.payments;
create policy "Admins gestionan pagos"
  on public.payments for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- 5. Crear un pedido desde la tienda
--
--    p_items    → [{ "kind": "product" | "package", "id": "<uuid>", "quantity": 2 }, …]
--    p_note     → comentario del cliente (opcional)
--    p_channel  → 'whatsapp' (hoy) o 'stripe' (pago con tarjeta, próximo paso)
--    p_currency → moneda de los precios guardados (NEXT_PUBLIC_CURRENCY)
--
--    · El precio se lee SIEMPRE de products / packages: lo que mande el
--      navegador se ignora (ADR-003).
--    · Solo acepta productos y paquetes activos.
--    · Si hay sesión, vincula el pedido al cliente y copia su contacto.
--    · Todo en una transacción: si algo falla no queda un pedido a medias.
--
--    SECURITY DEFINER: los visitantes no pueden insertar en orders
--    directamente (no hay política para eso); solo a través de aquí.
--    Devuelve el pedido con sus líneas (jsonb) para armar el mensaje.
-- ---------------------------------------------------------------------
create or replace function public.create_order(
  p_items    jsonb,
  p_note     text default null,
  p_channel  text default 'whatsapp',
  p_currency text default 'USD'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid        uuid := auth.uid();
  v_customer   public.customers%rowtype;
  v_order_id   uuid;
  v_note       text := nullif(trim(coalesce(p_note, '')), '');
  v_line       record;
  v_name       text;
  v_detail     text;
  v_price      numeric(12, 2);
  v_position   integer := 0;
  v_result     jsonb;
begin
  if p_channel is null or p_channel not in ('whatsapp', 'stripe') then
    raise exception 'Canal de pedido inválido' using errcode = '22023';
  end if;
  if p_currency is null or p_currency !~ '^[A-Z]{3}$' then
    raise exception 'Moneda inválida' using errcode = '22023';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido está vacío' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 30 then
    raise exception 'Máximo 30 productos distintos por pedido' using errcode = '22023';
  end if;
  if v_note is not null and char_length(v_note) > 500 then
    raise exception 'El comentario es demasiado largo' using errcode = '22023';
  end if;

  -- Datos de contacto si el cliente inició sesión
  if v_uid is not null then
    select * into v_customer from public.customers where id = v_uid;
  end if;

  insert into public.orders
    (customer_id, contact_name, contact_email, contact_phone, channel, currency, customer_note)
  values (
    v_customer.id,
    nullif(trim(concat_ws(' ', v_customer.first_name, v_customer.last_name)), ''),
    v_customer.email,
    v_customer.phone,
    p_channel,
    p_currency,
    v_note
  )
  returning id into v_order_id;

  -- Agrupa líneas repetidas (mismo producto dos veces) respetando el orden
  for v_line in
    select
      e ->> 'kind'                         as kind,
      (e ->> 'id')::uuid                   as item_id,
      sum((e ->> 'quantity')::integer)     as quantity
    from jsonb_array_elements(p_items) with ordinality as t(e, ord)
    group by 1, 2
    order by min(ord)
  loop
    if v_line.kind is null or v_line.kind not in ('product', 'package') then
      raise exception 'Tipo de producto inválido' using errcode = '22023';
    end if;
    if v_line.quantity is null or v_line.quantity not between 1 and 99 then
      raise exception 'La cantidad debe estar entre 1 y 99' using errcode = '22023';
    end if;

    if v_line.kind = 'product' then
      select p.name, p.flavor, p.price
        into v_name, v_detail, v_price
      from public.products p
      where p.id = v_line.item_id and p.is_active;
    else
      select pk.name, pk.price,
             (select string_agg(pi.quantity || '× ' || pr.name || ' ' || pr.flavor, ' + '
                                order by pi.sort_order, pr.name)
                from public.package_items pi
                join public.products pr on pr.id = pi.product_id
               where pi.package_id = pk.id)
        into v_name, v_price, v_detail
      from public.packages pk
      where pk.id = v_line.item_id and pk.is_active;
    end if;

    if not found then
      raise exception 'Un producto del carrito ya no está disponible' using errcode = 'P0002';
    end if;

    insert into public.order_items
      (order_id, kind, product_id, package_id, name, detail, unit_price, quantity, sort_order)
    values (
      v_order_id,
      v_line.kind,
      case when v_line.kind = 'product' then v_line.item_id end,
      case when v_line.kind = 'package' then v_line.item_id end,
      v_name,
      v_detail,
      v_price,
      v_line.quantity,
      v_position
    );
    v_position := v_position + 1;
  end loop;

  -- Totales calculados en la base de datos
  update public.orders o set
    subtotal           = t.subtotal,
    total              = t.subtotal + o.shipping,
    has_unpriced_items = t.has_unpriced
  from (
    select coalesce(sum(line_total), 0) as subtotal,
           coalesce(bool_or(unit_price is null), false) as has_unpriced
    from public.order_items
    where order_id = v_order_id
  ) t
  where o.id = v_order_id;

  select jsonb_build_object(
    'id',                 o.id,
    'number',             o.number,
    'status',             o.status,
    'channel',            o.channel,
    'currency',           o.currency,
    'subtotal',           o.subtotal,
    'shipping',           o.shipping,
    'total',              o.total,
    'has_unpriced_items', o.has_unpriced_items,
    'contact_name',       o.contact_name,
    'customer_note',      o.customer_note,
    'items', (
      select jsonb_agg(jsonb_build_object(
               'kind',       i.kind,
               'name',       i.name,
               'detail',     i.detail,
               'unit_price', i.unit_price,
               'quantity',   i.quantity,
               'line_total', i.line_total
             ) order by i.sort_order)
      from public.order_items i
      where i.order_id = o.id
    )
  )
  into v_result
  from public.orders o
  where o.id = v_order_id;

  return v_result;
end;
$$;

revoke all on function public.create_order(jsonb, text, text, text) from public;
grant execute on function public.create_order(jsonb, text, text, text) to anon, authenticated, service_role;
