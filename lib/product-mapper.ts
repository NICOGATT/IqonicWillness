import type { Json, ProductRow } from "@/types/database";
import {
  BENEFIT_ICONS,
  type BenefitIconName,
  type Product,
  type ProductBenefit,
  type ProductCategory,
  type ProductPackaging,
} from "@/types/product";

/** Fila de Supabase (snake_case) → modelo de dominio (camelCase). */
export function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    type: row.type,
    badge: row.badge,
    flavor: row.flavor,
    category: row.category,
    presentation: { label: row.presentation_label, detail: row.presentation_detail },
    benefits: parseBenefits(row.benefits),
    // numeric de Postgres puede llegar como string
    price: row.price === null ? null : Number(row.price),
    accent: { from: row.accent_from, to: row.accent_to },
    image: row.image_url,
    packaging: parsePackaging(row.packaging) ?? defaultPackaging(row),
    featured: row.featured,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

function isBenefitIcon(value: unknown): value is BenefitIconName {
  return typeof value === "string" && (BENEFIT_ICONS as readonly string[]).includes(value);
}

function parseBenefits(value: Json): ProductBenefit[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const label = typeof item.label === "string" ? item.label.trim() : "";
    if (!label) return [];
    return [{ icon: isBenefitIcon(item.icon) ? item.icon : "gem", label }];
  });
}

function parsePackaging(value: Json | null): ProductPackaging | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const { shape, title, subtitle, tag } = value;
  if ((shape !== "jar" && shape !== "pouch") || typeof title !== "string") return null;
  return {
    shape,
    title,
    subtitle: typeof subtitle === "string" ? subtitle : "",
    tag: typeof tag === "string" ? tag : "",
  };
}

/**
 * Ilustración generada para productos nuevos creados desde /admin:
 * gomitas → frasco; el resto → bolsa de stick packs.
 */
export function defaultPackaging(p: {
  name: string;
  category: ProductCategory;
  flavor: string;
  presentation_label: string;
}): ProductPackaging {
  const isJar = p.category === "gummies";
  const title = p.name.replace(/\s+GUMMIES$/i, "").toUpperCase();
  return {
    shape: isJar ? "jar" : "pouch",
    title,
    subtitle: isJar ? "DAILY GUMMIES" : p.flavor.toUpperCase(),
    tag: p.presentation_label.toUpperCase(),
  };
}

/** Convierte un texto en slug: "IQ Calm Gummies" → "iq-calm-gummies". */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
