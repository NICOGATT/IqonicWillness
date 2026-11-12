# Backend con Supabase · Guía paso a paso

Esta guía conecta la tienda y el panel `/admin` a Supabase (Postgres + Auth).
Tiempo estimado: 10–15 minutos.

## Arquitectura

```
Visitante ──► /            Server Component ──► lib/products.ts ("use cache", tag "products")
                                                 └─► utils/supabase/public.ts (anónimo, RLS: solo activos)

Admin ─────► proxy.ts      Refresca la sesión y redirige a /admin/login si no hay sesión
           ► /admin        lib/auth.ts → getClaims() + is_admin() → ProductsManager (cliente)
           ► Server Action app/admin/actions.ts → valida (zod) → Supabase (RLS: solo admins)
                                                → updateTag("products") → la tienda se actualiza
```

La seguridad tiene tres capas: el **proxy** (comprobación rápida), el **servidor**
(`getAdminSession()` en cada página y acción) y la **base de datos** (RLS). Aunque
alguien llamara a la API de Supabase directamente con la clave pública, RLS
le impide escribir si no está en la tabla `admins`.

## Paso 1 · Crear el proyecto

1. Entra en [supabase.com](https://supabase.com) → **New project**.
2. Guarda la contraseña de la base de datos y elige la región más cercana a tus clientes.

## Paso 2 · Crear la tabla, las políticas y cargar los productos

1. Dashboard → **SQL Editor** → **New query**.
2. Pega el contenido de [`supabase/migrations/0001_products.sql`](supabase/migrations/0001_products.sql) y pulsa **Run**.
3. Nueva query: pega [`supabase/seed.sql`](supabase/seed.sql) y pulsa **Run** (carga los 5 productos).
4. Comprueba en **Table Editor → products** que aparecen 5 filas.

Qué crea el script:

| Objeto | Para qué |
|---|---|
| `products` | Catálogo: nombre, slug, descripción, tipo, sabor, presentación, beneficios (`jsonb`), precio, imagen, colores, visibilidad y orden. |
| `admins` | Lista de usuarios con permiso de edición (sin acceso desde la API). |
| `is_admin()` | Función que responde si el usuario de la petición es admin. |
| Políticas RLS | Lectura pública de productos **activos**; lectura total y escritura solo para admins. |

## Paso 3 · Crear tu usuario administrador

1. Dashboard → **Authentication → Users → Add user → Create new user**.
2. Escribe tu correo y una contraseña segura y marca **Auto Confirm User**.
3. **Recomendado:** Authentication → **Sign In / Providers** → desactiva **Allow new users to sign up**.
   Así nadie más puede crearse una cuenta en tu proyecto.

## Paso 4 · Darle permisos de administrador

En el **SQL Editor** (cambia el correo):

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'tu-correo@ejemplo.com';
```

Para quitar permisos: `delete from public.admins where user_id = (select id from auth.users where email = '...');`

## Paso 5 · Variables de entorno

1. Dashboard → botón **Connect** (o Project Settings → API Keys).
2. Copia la **Project URL** y la **Publishable key** (`sb_publishable_...`).
3. En la raíz del proyecto:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_WHATSAPP_NUMBER=5215512345678
NEXT_PUBLIC_CURRENCY=USD
```

Reinicia `npm run dev` después de cambiar `.env.local`. En producción (Vercel, etc.)
añade las mismas variables en la configuración del proyecto.

## Paso 6 · Probar

1. `npm run dev` → abre `http://localhost:3000/admin` → te redirige a `/admin/login`.
2. Entra con el usuario del paso 3.
3. Edita un producto (por ejemplo, ponle precio) → **Guardar cambios**.
4. Abre `http://localhost:3000` → el cambio aparece en la tarjeta.

## Archivos del backend

| Archivo | Rol |
|---|---|
| `utils/supabase/server.ts` | Cliente con cookies para Server Components y Server Actions. |
| `utils/supabase/client.ts` | Cliente para el navegador (Realtime, Storage…). |
| `utils/supabase/public.ts` | Cliente anónimo sin cookies para el catálogo cacheado. |
| `utils/supabase/proxy.ts` + `proxy.ts` | Refresco de sesión y protección optimista de `/admin`. |
| `lib/auth.ts` | `getAdminSession()`: sesión validada + comprobación de admin. |
| `lib/products.ts` | Lecturas públicas con caché (`cacheTag("products")`). |
| `lib/admin-products.ts` | Listado completo para el panel (sin caché). |
| `lib/validation/product.ts` | Validación del formulario con zod. |
| `app/admin/actions.ts` | Server Actions: `signIn`, `signOut`, `saveProduct`, `deleteProduct`. |
| `components/admin/*` | Login, tabla, modal de producto con vista previa, confirmación de borrado. |
| `types/database.ts` | Tipos de la BD (regenerables con `npx supabase gen types`). |

## Sin Supabase configurado

Si faltan las variables, la tienda usa el catálogo de respaldo de `data/products.ts`
y `/admin` muestra un aviso. Útil para desarrollar el diseño sin conexión.

## Siguientes pasos sugeridos

- **Subir imágenes**: crear un bucket público `product-images` en Supabase Storage y
  añadir un campo de subida al formulario (hoy se pega una URL).
- **Tipos generados**: `npx supabase gen types typescript --project-id <id> > types/database.ts`.
- **Migraciones con la CLI**: `npx supabase link` + `npx supabase db push` para versionar cambios de esquema.
