-- =====================================================================
-- IQONIC WELLNESS · Carga inicial de los 5 productos
-- Ejecutar DESPUÉS de migrations/0001_products.sql.
-- Si el slug ya existe, actualiza el producto (se puede volver a ejecutar).
-- Los precios quedan en NULL: complétalos desde /admin.
-- =====================================================================

insert into public.products
  (slug, name, description, type, badge, category, flavor,
   presentation_label, presentation_detail, benefits,
   accent_from, accent_to, packaging, featured, sort_order)
values
  ('iq-protect-gummies', 'IQ PROTECT GUMMIES',
   'Gomitas diarias con vitaminas esenciales para apoyar tus defensas y tu bienestar.',
   'Wellness Support Gummies', 'Daily Gummies', 'gummies', 'Mango',
   '60 Gummies', 'Dietary Supplement',
   '[{"icon":"pill","label":"Vitaminas esenciales"},{"icon":"shield","label":"Apoyo inmune"},{"icon":"sun","label":"Bienestar diario"},{"icon":"leaf","label":"Defensa antioxidante"}]',
   '#FFA51F', '#FF7A1A',
   '{"shape":"jar","title":"IQ PROTECT","subtitle":"DAILY GUMMIES","tag":"60 GUMMIES"}',
   true, 10),

  ('ignite-energy', 'IGNITE',
   'Fórmula de hidrógeno en stick packs para energía, enfoque y rendimiento.',
   'Energy + Performance', 'Hydrogen Formula', 'energy', 'Amazon Punch',
   '30 Stick Packs', 'Net Wt. 7.4 oz (210 g)',
   '[{"icon":"bolt","label":"Impulso de energía"},{"icon":"target","label":"Enfoque agudo"},{"icon":"trend","label":"Resistencia máxima"},{"icon":"refresh","label":"Recuperación rápida"}]',
   '#B26BFF', '#7C3AED',
   '{"shape":"pouch","title":"IGNITE","subtitle":"ENERGY + PERFORMANCE","tag":"30 STICK PACKS"}',
   true, 20),

  ('iq-calm-gummies', 'IQ CALM GUMMIES',
   'Gomitas anti-estrés para mantener la calma y el equilibrio en tu día.',
   'Anti-Stress Gummies', 'Daily Gummies', 'gummies', 'Peach',
   '30 Gummies', 'Dietary Supplement',
   '[{"icon":"heart","label":"Manejo del estrés"},{"icon":"wave","label":"Enfoque en calma"},{"icon":"balance","label":"Equilibrio diario"},{"icon":"wind","label":"Alivio de tensión"}]',
   '#FFB38A', '#FF8A65',
   '{"shape":"jar","title":"IQ CALM","subtitle":"ANTI-STRESS","tag":"30 GUMMIES"}',
   false, 30),

  ('daily-shots-lemon', 'DAILY SHOTS',
   'Hidratación diaria con electrolitos esenciales y 25 minerales traza.',
   'Daily Performance Fuel', '30 Daily Stick Packs', 'hydration', 'Lemon Splash',
   '30 Stick Packs', 'Net Wt. 7.4 oz (210 g)',
   '[{"icon":"drop","label":"Soporte de hidratación"},{"icon":"pulse","label":"Electrolitos esenciales"},{"icon":"gem","label":"25 minerales traza"},{"icon":"trophy","label":"Rendimiento diario"}]',
   '#FFD84D', '#F5B70A',
   '{"shape":"pouch","title":"DAILY","subtitle":"SHOTS","tag":"LEMON SPLASH"}',
   true, 40),

  ('daily-shots-tropical', 'DAILY SHOTS',
   'Hidratación diaria con electrolitos esenciales y 25 minerales traza.',
   'Daily Performance Fuel', '30 Daily Stick Packs', 'hydration', 'Tropical Punch',
   '30 Stick Packs', 'Net Wt. 7.4 oz (210 g)',
   '[{"icon":"drop","label":"Soporte de hidratación"},{"icon":"pulse","label":"Electrolitos esenciales"},{"icon":"gem","label":"25 minerales traza"},{"icon":"trophy","label":"Rendimiento diario"}]',
   '#FF7A2E', '#E8401C',
   '{"shape":"pouch","title":"DAILY","subtitle":"SHOTS","tag":"TROPICAL PUNCH"}',
   false, 50)
on conflict (slug) do update set
  name                = excluded.name,
  description         = excluded.description,
  type                = excluded.type,
  badge               = excluded.badge,
  category            = excluded.category,
  flavor              = excluded.flavor,
  presentation_label  = excluded.presentation_label,
  presentation_detail = excluded.presentation_detail,
  benefits            = excluded.benefits,
  accent_from         = excluded.accent_from,
  accent_to           = excluded.accent_to,
  packaging           = excluded.packaging,
  featured            = excluded.featured,
  sort_order          = excluded.sort_order;
