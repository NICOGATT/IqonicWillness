/**
 * Modelo de dominio de un producto.
 * Es el "contrato" entre la capa de datos (hoy un mock, mañana una API / BD)
 * y la UI. Si el backend cambia, solo hay que adaptar `lib/products.ts`.
 */

export type ProductCategory = "gummies" | "energy" | "hydration";

/** Iconos disponibles para los beneficios (ver components/product/BenefitIcon.tsx). */
export type BenefitIconName =
  | "pill"
  | "shield"
  | "sun"
  | "leaf"
  | "bolt"
  | "target"
  | "trend"
  | "refresh"
  | "heart"
  | "wave"
  | "balance"
  | "wind"
  | "drop"
  | "pulse"
  | "gem"
  | "trophy";

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
  /** Identificador único y slug para futuras rutas (/productos/[id]). */
  id: string;
  name: string;
  /** Línea / tipo tal como aparece en el empaque. */
  type: string;
  /** Etiqueta corta sobre la imagen. */
  badge: string;
  flavor: string;
  category: ProductCategory;
  presentation: {
    label: string;
    detail: string;
  };
  benefits: ProductBenefit[];
  accent: ProductAccent;
  /** Ruta a una foto real en /public (opcional). Si falta, se dibuja el envase en SVG. */
  image?: string;
  packaging: ProductPackaging;
  /** Para destacar productos en el hero u ordenar el catálogo. */
  featured?: boolean;
  // Campos previstos para la siguiente fase (backend propio):
  // price?: number; stock?: number; sku?: string; createdAt?: string;
}

export interface CategoryFilter {
  value: ProductCategory | "all";
  label: string;
}
