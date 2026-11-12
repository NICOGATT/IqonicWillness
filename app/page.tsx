import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { ProductCatalog } from "@/components/product/ProductCatalog";
import { Benefits } from "@/components/sections/Benefits";
import { ContactCTA } from "@/components/sections/ContactCTA";
import { Hero } from "@/components/sections/Hero";
import { Marquee } from "@/components/sections/Marquee";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FloatingWhatsApp } from "@/components/whatsapp/FloatingWhatsApp";
import { getCategoryFilters, getFeaturedProducts, getProducts } from "@/lib/products";

/**
 * Página principal (Server Component).
 * Obtiene los datos en el servidor y los pasa a los componentes.
 * Cambiar el origen de datos solo afecta a lib/products.ts.
 */
export default async function HomePage() {
  const [products, featured, filters] = await Promise.all([
    getProducts(),
    getFeaturedProducts(),
    getCategoryFilters(),
  ]);

  return (
    <>
      <Navbar />
      <main>
        <Hero featured={featured} />
        <Marquee />

        <section id="productos" className="relative scroll-mt-20 py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading
              eyebrow="Catálogo"
              title="Elige tu fórmula"
              description={
                <>
                  Cinco productos, un mismo objetivo: que rindas y te sientas bien cada día. Toca{" "}
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

        <Benefits />
        <ContactCTA />
      </main>
      <Footer />
      <FloatingWhatsApp />
    </>
  );
}
