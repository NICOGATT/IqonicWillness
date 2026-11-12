import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";

import { siteConfig } from "@/config/site";

import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: `${siteConfig.name} · Energía, Rendimiento y Bienestar`,
  description: siteConfig.description,
  openGraph: {
    title: `${siteConfig.name} · Energía, Rendimiento y Bienestar`,
    description: siteConfig.description,
    type: "website",
    locale: "es_ES",
  },
};

export const viewport: Viewport = {
  themeColor: "#07070a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${inter.variable} ${sora.variable}`}>
      <body className="overflow-x-hidden font-sans text-zinc-300 antialiased">{children}</body>
    </html>
  );
}
