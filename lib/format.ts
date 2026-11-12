import { siteConfig } from "@/config/site";

/** 24.9 → "US$24.90" (según siteConfig.currency y siteConfig.locale). */
export function formatPrice(value: number): string {
  try {
    return new Intl.NumberFormat(siteConfig.locale, {
      style: "currency",
      currency: siteConfig.currency,
    }).format(value);
  } catch {
    // Código de moneda inválido en .env: muestra el número tal cual
    return value.toFixed(2);
  }
}
