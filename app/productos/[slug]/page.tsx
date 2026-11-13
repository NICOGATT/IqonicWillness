import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";

import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { BenefitIcon } from "@/components/product/BenefitIcon";
import { ProductArt } from "@/components/product/ProductArt";
import { ProductCard } from "@/components/product/ProductCard";
import { FloatingWhatsApp } from "@/components/whatsapp/FloatingWhatsApp";
import { WhatsAppButton } from "@/components/whatsapp/WhatsAppButton";
import { siteConfig } from "@/config/site";
import { formatPrice } from "@/lib/format";
import { getPackages } from "@/lib/packages";
import { getProductBySlug, getProducts } from "@/lib/products";
import { getProductMessage } from "@/lib/whatsapp";
import { PRODUCT_CATEGORIES } from "@/types/product";

/**
 * /productos/[slug] — Detalle de un producto.
 * Con Cache Components, generateStaticParams debe devolver al menos un slug:
 * los productos existentes se prerenderizan en el build y los nuevos se
 * generan en su primera visita (y se invalidan con la etiqueta "products").
 */
const PLACEHOLDER_SLUG = "__sin-productos__";

export async function generateStaticParams() {
  const products = await getProducts();
  return products.length ? products.map((p) => ({ slug: p.slug })) : [{ slug: PLACEHOLDER_SLUG }];
}

export async function generateMetadata({ params }: PageProps<"/productos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: `Producto no encontrado · ${siteConfig.name}` };

  const title = `${product.name} ${product.flavor} · ${siteConfig.name}`;
  const description = product.description ?? `${product.type} sabor ${product.flavor}. ${product.presentation.label}.`;
  return {
    title,
    description,
    alternates: { canonical: `/productos/${product.slug}` },
    openGraph: {
      title,
      description,
      url: `/productos/${product.slug}`,
      ...(product.image?.startsWith("https://") ? { images: [{ url: product.image, alt: product.name }] } : {}),
    },
  };
}

export default async function ProductPage({ params }: PageProps<"/productos/[slug]">) {
  const { slug } = await params;
  const [product, products, packages] = await Promise.all([getProductBySlug(slug), getProducts(), getPackages()]);
  if (!product) notFound();

  const category = PRODUCT_CATEGORIES.find((c) => c.value === product.category)?.label ?? product.category;
  const inPackages = packages.filter((pkg) => pkg.items.some((i) => i.productId === product.id));
  // Primero los de la misma categoría, luego el resto
  const related = products
    .filter((p) => p.id !== product.id)
    .sort((a, b) => Number(b.category === product.category) - Number(a.category === product.category))
    .slice(0, 3);

  const accentVars = { "--accent": product.accent.from, "--accent-2": product.accent.to } as CSSProperties;

  // Datos estructurados para Google (ficha de producto)
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${product.name} ${product.flavor}`,
    description: product.description ?? undefined,
    brand: { "@type": "Brand", name: siteConfig.name },
    category,
    ...(product.image?.startsWith("https://") ? { image: product.image } : {}),
    ...(product.price !== null
      ? {
          offers: {
            "@type": "Offer",
            price: product.price.toFixed(2),
            priceCurrency: siteConfig.currency,
            availability: "https://schema.org/InStock",
            url: `${siteConfig.url}/productos/${product.slug}`,
          },
        }
      : {}),
  };

  return (
    <>
      <Navbar defaultActive="productos" />
      <script
        type="application/ld+json"
        // Datos de nuestra base; "<" escapado para no poder cerrar el <script>
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c") }}
      />
      <main style={accentVars} className="pb-20 pt-24 md:pt-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Migas de pan */}
          <nav aria-label="Ruta" className="text-sm text-zinc-500">
            <ol className="flex flex-wrap items-center gap-2">
              <li><Link href="/" className="transition hover:text-white">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/#productos" className="transition hover:text-white">Productos</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-zinc-300">{product.name}</li>
            </ol>
          </nav>

          <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
            {/* Imagen */}
            <div className="relative grid min-h-[340px] place-items-center overflow-hidden rounded-[2rem] border border-white/[.07] bg-white/[.02] sm:min-h-[460px] lg:sticky lg:top-28 lg:self-start">
              <div className="card-glow absolute left-1/2 top-1/2 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 opacity-80 blur-3xl" />
              {product.badge && (
                <span className="border-accent-soft text-accent absolute left-5 top-5 rounded-full border bg-black/40 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur">
                  {product.badge}
                </span>
              )}
              <div className="relative h-80 w-72 sm:h-[26rem] sm:w-96">
                <ProductArt product={product} uid={`detail-${product.id}`} priority />
              </div>
            </div>

            {/* Información */}
            <div>
              <p className="text-accent text-xs font-semibold uppercase tracking-[0.2em]">
                {product.type} · {category}
              </p>
              <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">{product.name}</h1>

              <span className="border-accent-soft bg-accent-soft mt-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium text-white">
                <span className="dot-accent h-2 w-2 rounded-full" />
                Sabor <span className="text-accent font-semibold">{product.flavor}</span>
              </span>

              <div className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-3">
                <p className="font-display text-4xl font-bold text-white">
                  {product.price !== null ? formatPrice(product.price) : <span className="text-2xl text-zinc-400">Consultar precio</span>}
                </p>
                <p className="text-sm text-zinc-400">
                  {product.presentation.label}
                  {product.presentation.detail && <span className="text-zinc-500"> · {product.presentation.detail}</span>}
                </p>
              </div>

              <WhatsAppButton
                variant="accent"
                size="lg"
                className="mt-8 w-full sm:w-auto"
                message={getProductMessage(product)}
                ariaLabel={`Pedir ${product.name} sabor ${product.flavor} por WhatsApp`}
              />

              {product.description && (
                <section className="mt-10">
                  <h2 className="font-display text-lg font-bold text-white">Descripción</h2>
                  <p className="mt-3 whitespace-pre-line leading-relaxed text-zinc-300">{product.description}</p>
                </section>
              )}

              {product.benefits.length > 0 && (
                <section className="mt-10">
                  <h2 className="font-display text-lg font-bold text-white">Beneficios</h2>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {product.benefits.map((benefit) => (
                      <li
                        key={benefit.label}
                        className="flex items-center gap-3 rounded-2xl border border-white/[.06] bg-white/[.02] px-4 py-3 text-sm text-zinc-200"
                      >
                        <span className="bg-accent-soft text-accent grid h-10 w-10 shrink-0 place-items-center rounded-xl">
                          <BenefitIcon name={benefit.icon} />
                        </span>
                        {benefit.label}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {inPackages.length > 0 && (
                <section className="mt-10 rounded-2xl border border-brand-violet/25 bg-brand-violet/[.06] p-5">
                  <h2 className="font-display text-lg font-bold text-white">Ahorra llevándolo en un paquete</h2>
                  <ul className="mt-3 space-y-2">
                    {inPackages.map((pkg) => (
                      <li key={pkg.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                        <Link href="/#paquetes" className="font-semibold text-white underline-offset-4 hover:underline">
                          {pkg.name}
                        </Link>
                        <span className="text-zinc-400">
                          {formatPrice(pkg.price)}
                          {pkg.savings !== null && <span className="ml-2 text-wa">ahorras {formatPrice(pkg.savings)}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>

          {related.length > 0 && (
            <section className="mt-24">
              <h2 className="text-center font-display text-2xl font-bold text-white sm:text-3xl">También te puede interesar</h2>
              <div className="mt-10 flex flex-wrap justify-center gap-6 lg:gap-8">
                {related.map((p) => (
                  <ProductCard key={p.id} product={p} className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-22px)]" />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
