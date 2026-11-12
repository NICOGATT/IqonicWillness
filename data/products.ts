import type { CategoryFilter, Product } from "@/types/product";

/**
 * Catálogo mock de IQONIC THRIVE.
 *
 * Fuente única de verdad para la UI en esta primera versión.
 * La UI NO importa este archivo directamente: pasa por `lib/products.ts`,
 * así que reemplazarlo por una base de datos o API no toca los componentes.
 */
export const products: Product[] = [
  {
    id: "iq-protect-gummies",
    name: "IQ PROTECT GUMMIES",
    type: "Wellness Support Gummies",
    badge: "Daily Gummies",
    flavor: "Mango",
    category: "gummies",
    presentation: { label: "60 Gummies", detail: "Dietary Supplement" },
    benefits: [
      { icon: "pill", label: "Vitaminas esenciales" },
      { icon: "shield", label: "Apoyo inmune" },
      { icon: "sun", label: "Bienestar diario" },
      { icon: "leaf", label: "Defensa antioxidante" },
    ],
    accent: { from: "#FFA51F", to: "#FF7A1A" },
    packaging: { shape: "jar", title: "IQ PROTECT", subtitle: "DAILY GUMMIES", tag: "60 GUMMIES" },
    featured: true,
  },
  {
    id: "ignite-energy",
    name: "IGNITE",
    type: "Energy + Performance",
    badge: "Hydrogen Formula",
    flavor: "Amazon Punch",
    category: "energy",
    presentation: { label: "30 Stick Packs", detail: "Net Wt. 7.4 oz (210 g)" },
    benefits: [
      { icon: "bolt", label: "Impulso de energía" },
      { icon: "target", label: "Enfoque agudo" },
      { icon: "trend", label: "Resistencia máxima" },
      { icon: "refresh", label: "Recuperación rápida" },
    ],
    accent: { from: "#B26BFF", to: "#7C3AED" },
    packaging: { shape: "pouch", title: "IGNITE", subtitle: "ENERGY + PERFORMANCE", tag: "30 STICK PACKS" },
    featured: true,
  },
  {
    id: "iq-calm-gummies",
    name: "IQ CALM GUMMIES",
    type: "Anti-Stress Gummies",
    badge: "Daily Gummies",
    flavor: "Peach",
    category: "gummies",
    presentation: { label: "30 Gummies", detail: "Dietary Supplement" },
    benefits: [
      { icon: "heart", label: "Manejo del estrés" },
      { icon: "wave", label: "Enfoque en calma" },
      { icon: "balance", label: "Equilibrio diario" },
      { icon: "wind", label: "Alivio de tensión" },
    ],
    accent: { from: "#FFB38A", to: "#FF8A65" },
    packaging: { shape: "jar", title: "IQ CALM", subtitle: "ANTI-STRESS", tag: "30 GUMMIES" },
  },
  {
    id: "daily-shots-lemon",
    name: "DAILY SHOTS",
    type: "Daily Performance Fuel",
    badge: "30 Daily Stick Packs",
    flavor: "Lemon Splash",
    category: "hydration",
    presentation: { label: "30 Stick Packs", detail: "Net Wt. 7.4 oz (210 g)" },
    benefits: [
      { icon: "drop", label: "Soporte de hidratación" },
      { icon: "pulse", label: "Electrolitos esenciales" },
      { icon: "gem", label: "25 minerales traza" },
      { icon: "trophy", label: "Rendimiento diario" },
    ],
    accent: { from: "#FFD84D", to: "#F5B70A" },
    packaging: { shape: "pouch", title: "DAILY", subtitle: "SHOTS", tag: "LEMON SPLASH" },
    featured: true,
  },
  {
    id: "daily-shots-tropical",
    name: "DAILY SHOTS",
    type: "Daily Performance Fuel",
    badge: "30 Daily Stick Packs",
    flavor: "Tropical Punch",
    category: "hydration",
    presentation: { label: "30 Stick Packs", detail: "Net Wt. 7.4 oz (210 g)" },
    benefits: [
      { icon: "drop", label: "Soporte de hidratación" },
      { icon: "pulse", label: "Electrolitos esenciales" },
      { icon: "gem", label: "25 minerales traza" },
      { icon: "trophy", label: "Rendimiento diario" },
    ],
    accent: { from: "#FF7A2E", to: "#E8401C" },
    packaging: { shape: "pouch", title: "DAILY", subtitle: "SHOTS", tag: "TROPICAL PUNCH" },
  },
];

/** Filtros del catálogo. */
export const categoryFilters: CategoryFilter[] = [
  { value: "all", label: "Todos" },
  { value: "gummies", label: "Gomitas" },
  { value: "energy", label: "Energía" },
  { value: "hydration", label: "Hidratación" },
];
