/**
 * Modelo de dominio de un paquete (camelCase, independiente de la BD).
 * lib/packages.ts convierte las filas de la vista packages_with_items.
 */

export interface PackageContent {
  productId: string;
  slug: string;
  name: string;
  flavor: string;
  quantity: number;
  unitPrice: number | null;
}

export interface ProductPackage {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  badge: string | null;
  price: number;
  imageUrl: string | null;
  featured: boolean;
  items: PackageContent[];
  /** Unidades totales (suma de cantidades). */
  itemCount: number;
  /** Lo que costaría todo por separado; null si algún producto no tiene precio. */
  regularPrice: number | null;
  /** regularPrice − price (solo si es positivo). */
  savings: number | null;
}
