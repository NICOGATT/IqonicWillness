/**
 * Configuración global del sitio.
 * El número de WhatsApp se lee de la variable de entorno NEXT_PUBLIC_WHATSAPP_NUMBER
 * (ver .env.example). Formato internacional, solo dígitos: ej. 5215512345678.
 */
export const siteConfig = {
  name: "IQONIC THRIVE",
  description:
    "Suplementos de bienestar y rendimiento: gomitas, energía e hidratación diaria. Pide directo por WhatsApp.",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "TU_NUMERO",
  generalMessage: "Hola, quiero información sobre los productos IQONIC THRIVE.",
  nav: [
    { href: "#inicio", label: "Inicio", id: "inicio" },
    { href: "#productos", label: "Productos", id: "productos" },
    { href: "#beneficios", label: "Beneficios", id: "beneficios" },
    { href: "#contacto", label: "Contacto", id: "contacto" },
  ],
  // Reemplaza por los enlaces reales de tus redes.
  social: {
    instagram: "#",
    facebook: "#",
    tiktok: "#",
  },
} as const;
