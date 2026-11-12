# IQONIC WELLNESS · Catálogo digital

Catálogo de productos de bienestar y rendimiento con pedidos por WhatsApp.
Next.js 16 (App Router + Cache Components), React 19, Tailwind CSS v4, TypeScript y Supabase
(base de datos + autenticación del panel `/admin`). **Configuración del backend: [SUPABASE.md](SUPABASE.md).**

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # WhatsApp + claves de Supabase (ver SUPABASE.md)
npm run dev                  # http://localhost:3000
```

`npm run build && npm run start` genera y sirve la versión de producción.

## Estructura

```
app/
  layout.tsx            # HTML raíz, fuentes (Inter + Sora) y metadata SEO
  page.tsx              # Home (Server Component): obtiene datos y compone secciones
  globals.css           # Tokens de diseño (Tailwind v4 @theme) y clases de componentes
components/
  layout/               # Navbar (cliente), Footer
  sections/             # Hero, Marquee, Benefits, ContactCTA
  product/              # ProductCard, ProductCatalog (filtros, cliente), ProductArt (SVG/foto), BenefitIcon
  whatsapp/             # WhatsAppButton, FloatingWhatsApp
  icons/                # WhatsAppIcon
  ui/                   # Reveal, SectionHeading, Logo, CurrentYear
app/admin/              # Panel: login/, page.tsx (CRUD) y actions.ts (Server Actions)
components/admin/       # ProductsManager, ProductFormDialog, DeleteProductDialog, LoginForm...
config/site.ts          # Nombre, navegación, redes, WhatsApp y moneda
data/products.ts        # Catálogo de respaldo (si Supabase no está configurado)
lib/products.ts         # Lecturas públicas desde Supabase con caché (tag "products")
lib/auth.ts             # getAdminSession(): sesión + comprobación de admin
lib/whatsapp.ts         # buildWhatsAppUrl(), getProductMessage()
utils/supabase/         # Clientes server, client, public y refresco de sesión del proxy
proxy.ts                # Protege /admin (Next 16: antes "middleware")
supabase/               # migrations/0001_products.sql (tabla + RLS) y seed.sql
types/                  # product.ts (dominio) y database.ts (tablas de Supabase)
```

## Panel de administración

`/admin` (login con Supabase Auth) permite crear, editar, ocultar y eliminar productos.
Los cambios se publican al instante en la tienda gracias a `updateTag("products")`.
Esquema SQL, RLS y pasos de configuración en [SUPABASE.md](SUPABASE.md).

## Fotos reales de producto

Pega la URL de la imagen en el campo **URL de imagen** del panel (o una ruta de `public/`, como `/products/ignite.png`). Sin `image`, se dibuja el envase en SVG con los colores del producto.
