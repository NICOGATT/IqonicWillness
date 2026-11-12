/**
 * Configuración global del sitio.
 * El número de WhatsApp se lee de la variable de entorno NEXT_PUBLIC_WHATSAPP_NUMBER
 * (ver .env.example). Formato internacional, solo dígitos: ej. 5215512345678.
 */
/**
 * URL pública del sitio (para SEO: imágenes de redes, logo en Google).
 * Producción: NEXT_PUBLIC_SITE_URL; si falta, el dominio de Railway.
 */
const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "http://localhost:3000")
).replace(/\/$/, "");

export const siteConfig = {
  name: "IQONIC WELLNESS",
  url: siteUrl,
  /** Logo cuadrado (512×512) que Google usa en los resultados de búsqueda. */
  logo: "/logo.png",
  description:
    "Suplementos de bienestar y rendimiento: gomitas, energía e hidratación diaria. Pide directo por WhatsApp.",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "TU_NUMERO",
  generalMessage: "Hola, quiero información sobre los productos IQONIC WELLNESS.",
  /** Moneda y formato de los precios (código ISO 4217, p. ej. USD, MXN, COP, ARS, EUR). */
  currency: process.env.NEXT_PUBLIC_CURRENCY ?? "USD",
  locale: "es",
  nav: [
    { href: "/#inicio", label: "Inicio", id: "inicio" },
    { href: "/#productos", label: "Productos", id: "productos" },
    { href: "/#paquetes", label: "Paquetes", id: "paquetes" },
    { href: "/#beneficios", label: "Beneficios", id: "beneficios" },
    { href: "/#contacto", label: "Contacto", id: "contacto" },
  ],
  // Reemplaza por los enlaces reales de tus redes.
  social: {
    instagram: "#",
    facebook: "#",
    tiktok: "#",
  },
} as const;
