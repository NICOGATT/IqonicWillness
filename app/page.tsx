import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { PackageCard } from "@/components/product/PackageCard";
import { ProductCatalog } from "@/components/product/ProductCatalog";
import { Benefits } from "@/components/sections/Benefits";
import { ContactCTA } from "@/components/sections/ContactCTA";
import { Hero } from "@/components/sections/Hero";
import { Marquee } from "@/components/sections/Marquee";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FloatingWhatsApp } from "@/components/whatsapp/FloatingWhatsApp";
import { getPackages } from "@/lib/packages";
import { getCategoryFilters, getFeaturedProducts, getProducts } from "@/lib/products";

/**
 * Página principal (Server Component).
 * Obtiene los datos en el servidor y los pasa a los componentes.
 * Cambiar el origen de datos solo afecta a lib/products.ts.
 */
export default async function HomePage() {
  const [products, featured, filters, packages] = await Promise.all([
    getProducts(),
    getFeaturedProducts(),
    getCategoryFilters(),
    getPackages(),
  ]);
  const productsById = new Map(products.map((p) => [p.id, p]));

  return (
    <>
      <Navbar hiddenNav={packages.length > 0 ? [] : ["paquetes"]} />
      <main>
        <Hero featured={featured} totalProducts={products.length} />
        <Marquee />

        <section id="productos" className="relative scroll-mt-20 py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Catálogo"
              title="Elige tu fórmula"
              description={
                <>
                  Fórmulas con un mismo objetivo: que rindas y te sientas bien cada día. Toca{" "}
                  <span className="text-zinc-200">“Pedir por WhatsApp”</span> y te respondemos con disponibilidad y
                  precio.
                </>
              }
            />
            <Reveal>
              <ProductCatalog products={products} filters={filters} />
            </Reveal>
          </div>
        </section>

        {/* Solo aparece si hay paquetes visibles */}
        {packages.length > 0 && (
          <section id="paquetes" className="relative scroll-mt-20 py-20 md:py-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <SectionHeading
                eyebrow="Paquetes"
                eyebrowClassName="text-brand-violet"
                title="Combina y ahorra"
                description="Nuestras fórmulas juntas, a un precio especial. Pídelo por WhatsApp y te lo preparamos."
              />
              <Reveal>
                <div className="mt-12 flex flex-wrap justify-center gap-6 lg:gap-8">
                  {packages.map((pkg) => (
                    <PackageCard
                      key={pkg.id}
                      pkg={pkg}
                      productsById={productsById}
                      className="w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-22px)]"
                    />
                  ))}
                </div>
              </Reveal>
            </div>
          </section>
        )}

        <Benefits />
        <ContactCTA />
      </main>
      <Footer hiddenNav={packages.length > 0 ? [] : ["paquetes"]} />
      <FloatingWhatsApp />
    </>
  );
}
