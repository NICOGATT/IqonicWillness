-- =====================================================================
-- IQONIC WELLNESS · Paquetes de EJEMPLO
-- Ejecutar DESPUÉS de migrations/0003_packages.sql y de seed.sql.
-- Se crean OCULTOS (is_active = false) con precios de ejemplo:
-- revisa nombre, contenido y precio y luego actívalos.
-- Se puede volver a ejecutar: actualiza por slug y rehace el contenido.
-- =====================================================================

-- 1. Paquetes ---------------------------------------------------------
insert into public.packages (slug, name, description, badge, price, featured, is_active, sort_order)
values
  ('pack-energia-total', 'Pack Energía Total',
   'IGNITE para la energía y el enfoque + DAILY SHOTS para mantenerte hidratado todo el día.',
   'Combo', 59.90, true, false, 10),
  ('pack-bienestar-diario', 'Pack Bienestar Diario',
   'Defensas y calma: IQ PROTECT + IQ CALM para cuidarte todos los días.',
   'Combo', 49.90, false, false, 20)
on conflict (slug) do update set
  name        = excluded.name,
  description = excluded.description,
  badge       = excluded.badge,
  price       = excluded.price,
  featured    = excluded.featured,
  sort_order  = excluded.sort_order;

-- 2. Contenido (paquete_slug, producto_slug, cantidad, orden) ---------
delete from public.package_items
where package_id in (select id from public.packages where slug in ('pack-energia-total', 'pack-bienestar-diario'));

insert into public.package_items (package_id, product_id, quantity, sort_order)
select pk.id, pr.id, v.quantity, v.sort_order
from (values
  ('pack-energia-total',    'ignite-energy',      1, 1),
  ('pack-energia-total',    'daily-shots-lemon',  1, 2),
  ('pack-bienestar-diario', 'iq-protect-gummies', 1, 1),
  ('pack-bienestar-diario', 'iq-calm-gummies',    1, 2)
) as v(package_slug, product_slug, quantity, sort_order)
join public.packages pk on pk.slug = v.package_slug
join public.products pr on pr.slug = v.product_slug;

-- 3. Ver el resultado -------------------------------------------------
select name, price, item_count, regular_price, savings, items
from public.packages_with_items
order by sort_order;
