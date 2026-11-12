/**
 * Modelo de dominio de un producto (camelCase, independiente de la BD).
 * `lib/product-mapper.ts` convierte las filas de Supabase a este formato,
 * así los componentes no conocen los nombres de columnas.
 */

export type ProductCategory = "gummies" | "energy" | "hydration";

export const PRODUCT_CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: "gummies", label: "Gomitas" },
  { value: "energy", label: "Energía" },
  { value: "hydration", label: "Hidratación" },
];

/** Iconos disponibles para los beneficios (ver components/product/BenefitIcon.tsx). */
export const BENEFIT_ICONS = [
  "pill",
  "shield",
  "sun",
  "leaf",
  "bolt",
  "target",
  "trend",
  "refresh",
  "heart",
  "wave",
  "balance",
  "wind",
  "drop",
  "pulse",
  "gem",
  "trophy",
] as const;

export type BenefitIconName = (typeof BENEFIT_ICONS)[number];

export interface ProductBenefit {
  icon: BenefitIconName;
  label: string;
}

export interface ProductAccent {
  /** Color principal (hex). */
  from: string;
  /** Color secundario del degradado (hex). */
  to: string;
}

/** Datos para la ilustración del envase cuando no hay foto (`image`). */
export interface ProductPackaging {
  shape: "jar" | "pouch";
  title: string;
  subtitle: string;
  tag: string;
}

export interface Product {
  id: string;
  /** Identificador legible para URLs (/productos/[slug]). */
  slug: string;
  name: string;
  description: string | null;
  /** Línea / tipo tal como aparece en el empaque. */
  type: string;
  /** Etiqueta corta sobre la imagen. */
  badge: string | null;
  flavor: string;
  category: ProductCategory;
  presentation: {
    label: string;
    detail: string | null;
  };
  benefits: ProductBenefit[];
  /** Precio en la moneda de siteConfig.currency; null = "consultar". */
  price: number | null;
  accent: ProductAccent;
  /** URL de una foto real. Si falta, se dibuja el envase en SVG. */
  image: string | null;
  packaging: ProductPackaging;
  featured: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface CategoryFilter {
  value: ProductCategory | "all";
  label: string;
}
