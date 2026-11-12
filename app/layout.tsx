import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";

import { siteConfig } from "@/config/site";

import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["500", "600", "700", "800"] });

const title = `${siteConfig.name} · Energía, Rendimiento y Bienestar`;

// Los íconos (app/icon.svg, app/favicon.ico, app/apple-icon.tsx) y la imagen
// para redes (app/opengraph-image.tsx) los agrega Next.js automáticamente.
export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title,
  description: siteConfig.description,
  applicationName: siteConfig.name,
  openGraph: {
    title,
    description: siteConfig.description,
    siteName: siteConfig.name,
    url: "/",
    type: "website",
    locale: "es_ES",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: siteConfig.description,
  },
};

// Datos estructurados: Google toma de aquí el logo de la marca
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.name,
  url: siteConfig.url,
  logo: `${siteConfig.url}${siteConfig.logo}`,
};

export const viewport: Viewport = {
  themeColor: "#07070a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${inter.variable} ${sora.variable}`}>
      <body className="overflow-x-hidden font-sans text-zinc-300 antialiased">
        <script
          type="application/ld+json"
          // Contenido fijo nuestro (no viene del usuario); "<" escapado por seguridad
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }}
        />
        {children}
      </body>
    </html>
  );
}
