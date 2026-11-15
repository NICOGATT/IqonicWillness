import { z } from "zod";

/**
 * Checkout: medios de pago, formas de entrega y datos de contacto.
 * Lógica pura (sin React): la usan el formulario de /pago y la Server Action.
 *
 * Dos opciones:
 * - Tarjeta de crédito o débito (formulario con vista previa). El cobro real
 *   se activa con NEXT_PUBLIC_PAY_CARD=true cuando Stripe esté conectado.
 * - Pedir por WhatsApp: el pedido se registra y el pago se coordina por chat.
 */

export const PAYMENT_METHOD_IDS = ["card", "whatsapp"] as const;
export type PaymentMethodId = (typeof PAYMENT_METHOD_IDS)[number];

export interface PaymentMethod {
  id: PaymentMethodId;
  label: string;
  description: string;
  /** "online" → cobro con la pasarela · "whatsapp" → se coordina por chat. */
  flow: "online" | "whatsapp";
  /** Cómo se nombra en el mensaje y en la nota del pedido. */
  summary: string;
  /** false → se puede elegir y completar, pero el cobro todavía no está conectado. */
  live: boolean;
  /** Qué pasa después de confirmar. */
  nextStep: string;
}

export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  {
    id: "card",
    label: "Tarjeta de crédito o débito",
    description: "Visa, Mastercard y American Express.",
    flow: "online",
    summary: "Tarjeta de crédito o débito",
    live: process.env.NEXT_PUBLIC_PAY_CARD === "true",
    nextStep: "El pago se procesa de forma segura y te enviamos el comprobante por email.",
  },
  {
    id: "whatsapp",
    label: "Pedir por WhatsApp",
    description: "Coordinamos el pago por chat: transferencia, efectivo u otro medio.",
    flow: "whatsapp",
    summary: "A coordinar por WhatsApp",
    live: true,
    nextStep: "Coordinamos el pago y la entrega por el mismo chat de WhatsApp.",
  },
];

export function getPaymentMethod(id: PaymentMethodId): PaymentMethod {
  return PAYMENT_METHODS.find((m) => m.id === id) ?? PAYMENT_METHODS[PAYMENT_METHODS.length - 1];
}

export const DELIVERY_METHOD_IDS = ["shipping", "coordinate"] as const;
export type DeliveryMethodId = (typeof DELIVERY_METHOD_IDS)[number];

export const DELIVERY_METHODS: readonly { id: DeliveryMethodId; label: string; description: string }[] = [
  { id: "shipping", label: "Envío a domicilio", description: "El costo de envío se confirma por WhatsApp según la zona." },
  { id: "coordinate", label: "Coordinar por WhatsApp", description: "Acordamos punto de entrega o retiro por chat." },
];

/* --------------------------- Validación --------------------------- */

export const checkoutSchema = z
  .object({
    name: z.string().trim().min(2, "Escribe tu nombre").max(120, "Máximo 120 caracteres"),
    phone: z
      .string()
      .trim()
      .max(30, "Máximo 30 caracteres")
      .refine((v) => v.replace(/\D/g, "").length >= 7, "Escribe un teléfono válido"),
    email: z.union([z.literal(""), z.email("Escribe un email válido").max(254)]).optional(),
    delivery: z.enum(DELIVERY_METHOD_IDS),
    address: z.string().trim().max(160, "Máximo 160 caracteres").optional(),
    city: z.string().trim().max(80, "Máximo 80 caracteres").optional(),
    paymentMethod: z.enum(PAYMENT_METHOD_IDS),
  })
  .superRefine((data, ctx) => {
    if (data.delivery === "shipping") {
      if (!data.address || data.address.length < 4)
        ctx.addIssue({ code: "custom", path: ["address"], message: "Escribe la dirección de entrega" });
      if (!data.city || data.city.length < 2)
        ctx.addIssue({ code: "custom", path: ["city"], message: "Escribe la localidad o barrio" });
    }
    const method = getPaymentMethod(data.paymentMethod);
    // Stripe y Mercado Pago necesitan un email para el comprobante
    if (method.flow === "online" && !data.email)
      ctx.addIssue({ code: "custom", path: ["email"], message: "Necesitamos tu email para enviarte el comprobante" });
  });

export type CheckoutData = z.input<typeof checkoutSchema>;
export type CheckoutField = "name" | "phone" | "email" | "address" | "city";

/** Errores por campo para mostrar debajo de cada input. */
export function getCheckoutErrors(data: CheckoutData): Partial<Record<CheckoutField, string>> {
  const result = checkoutSchema.safeParse(data);
  if (result.success) return {};
  const errors: Partial<Record<CheckoutField, string>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as CheckoutField;
    errors[field] ??= issue.message;
  }
  return errors;
}

/* ------------------------ Mensaje y nota ------------------------- */

function deliveryText(data: CheckoutData): string {
  if (data.delivery === "shipping") {
    const place = [data.address?.trim(), data.city?.trim()].filter(Boolean).join(", ");
    return place ? `Envío a domicilio — ${place}` : "Envío a domicilio";
  }
  return "A coordinar por WhatsApp";
}

/** Líneas que se agregan al mensaje de WhatsApp (debajo del total). */
export function getCheckoutMessageLines(data: CheckoutData): string[] {
  const lines = [
    `Forma de pago: ${getPaymentMethod(data.paymentMethod).summary}`,
    `Entrega: ${deliveryText(data)}`,
    `Teléfono: ${data.phone.trim()}`,
  ];
  if (data.email?.trim()) lines.push(`Email: ${data.email.trim()}`);
  return lines;
}

/**
 * Nota que se guarda en el pedido (orders.customer_note, máx. 500):
 * así el admin ve pago, entrega y contacto aunque el cliente no tenga cuenta.
 */
export function getCheckoutOrderNote(data: CheckoutData, comment?: string | null): string {
  const parts = [
    `Pago: ${getPaymentMethod(data.paymentMethod).summary}`,
    `Entrega: ${deliveryText(data)}`,
    `Contacto: ${[data.name.trim(), data.phone.trim(), data.email?.trim()].filter(Boolean).join(" · ")}`,
  ];
  const cleanComment = comment?.trim();
  if (cleanComment) parts.push(`Comentario: ${cleanComment}`);
  const note = parts.join(" | ");
  return note.length > 500 ? `${note.slice(0, 499)}…` : note;
}
