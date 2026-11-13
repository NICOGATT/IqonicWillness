/**
 * Tipos de la base de datos de Supabase.
 *
 * Escritos a mano para que el proyecto compile sin depender de la CLI.
 * Cuando tengas el proyecto creado puedes regenerarlos con:
 *   npx supabase gen types typescript --project-id <TU_PROJECT_ID> > types/database.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ProductCategoryDb = "gummies" | "energy" | "hydration";

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  type: string;
  badge: string | null;
  category: ProductCategoryDb;
  flavor: string;
  presentation_label: string;
  presentation_detail: string | null;
  /** Array de { icon, label }. */
  benefits: Json;
  price: number | null;
  image_url: string | null;
  accent_from: string;
  accent_to: string;
  /** { shape, title, subtitle, tag } para la ilustración SVG; null = se genera automáticamente. */
  packaging: Json | null;
  featured: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ProductInsert = Omit<ProductRow, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ProductUpdate = Partial<ProductInsert>;

/** Paquete (pack / combo). Su contenido está en package_items. */
export type PackageRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  badge: string | null;
  /** Precio del paquete completo (misma moneda que products.price). */
  price: number;
  image_url: string | null;
  featured: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type PackageInsert = Omit<PackageRow, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type PackageUpdate = Partial<PackageInsert>;

/** Un producto dentro de un paquete, con su cantidad. */
export type PackageItemRow = {
  package_id: string;
  product_id: string;
  quantity: number;
  sort_order: number;
  created_at: string;
};

/** Elemento de `packages_with_items.items`. */
export type PackageContentItem = {
  product_id: string;
  slug: string;
  name: string;
  flavor: string;
  quantity: number;
  unit_price: number | null;
};

/** Vista `packages_with_items`: paquete + contenido + precio por separado. */
export type PackageWithItemsRow = PackageRow & {
  items: PackageContentItem[];
  item_count: number | null;
  /** Suma de los precios individuales; null si algún producto no tiene precio. */
  regular_price: number | null;
  /** regular_price − price. */
  savings: number | null;
};

/** Perfil del cliente. La contraseña NO está aquí: vive cifrada en auth.users. */
export type CustomerRow = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  /** Fecha ISO "YYYY-MM-DD". */
  birth_date: string | null;
  created_at: string;
  updated_at: string;
};

export const ORDER_STATUSES = ["pending", "confirmed", "paid", "shipped", "delivered", "cancelled", "refunded"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type OrderChannel = "whatsapp" | "stripe" | "mercadopago" | "manual";

/** Pedido. Los totales los calcula create_order() con precios de la BD. */
export type OrderRow = {
  id: string;
  /** Número legible (#1001). */
  number: number;
  customer_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  status: OrderStatus;
  channel: OrderChannel;
  currency: string;
  subtotal: number;
  shipping: number;
  total: number;
  has_unpriced_items: boolean;
  customer_note: string | null;
  admin_notes: string | null;
  shipping_address: Json | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Línea del pedido: nombre y precio copiados al momento de la compra. */
export type OrderItemRow = {
  id: string;
  order_id: string;
  kind: "product" | "package";
  product_id: string | null;
  package_id: string | null;
  name: string;
  detail: string | null;
  unit_price: number | null;
  quantity: number;
  line_total: number | null;
  sort_order: number;
  created_at: string;
};

export type PaymentRow = {
  id: string;
  order_id: string;
  provider: "stripe" | "mercadopago" | "cash" | "transfer";
  provider_payment_id: string | null;
  status: "pending" | "succeeded" | "failed" | "refunded";
  amount: number;
  currency: string;
  raw: Json | null;
  created_at: string;
  updated_at: string;
};

/** Lo que devuelve create_order(). */
export type CreatedOrder = Pick<
  OrderRow,
  | "id"
  | "number"
  | "status"
  | "channel"
  | "currency"
  | "subtotal"
  | "shipping"
  | "total"
  | "has_unpriced_items"
  | "contact_name"
  | "customer_note"
> & {
  items: Pick<OrderItemRow, "kind" | "name" | "detail" | "unit_price" | "quantity" | "line_total">[];
};

export type Database = {
  public: {
    Tables: {
      products: {
        Row: ProductRow;
        Insert: ProductInsert;
        Update: ProductUpdate;
        Relationships: [];
      };
      customers: {
        Row: CustomerRow;
        Insert: Partial<CustomerRow> & { id: string; email: string };
        Update: Partial<Pick<CustomerRow, "first_name" | "last_name" | "phone" | "birth_date">>;
        Relationships: [];
      };
      admins: {
        Row: { user_id: string; created_at: string };
        Insert: { user_id: string; created_at?: string };
        Update: { user_id?: string; created_at?: string };
        Relationships: [];
      };
      packages: {
        Row: PackageRow;
        Insert: PackageInsert;
        Update: PackageUpdate;
        Relationships: [];
      };
      package_items: {
        Row: PackageItemRow;
        Insert: Omit<PackageItemRow, "created_at" | "quantity" | "sort_order"> &
          Partial<Pick<PackageItemRow, "created_at" | "quantity" | "sort_order">>;
        Update: Partial<PackageItemRow>;
        Relationships: [];
      };
      orders: {
        Row: OrderRow;
        // Se crean con create_order(); el admin solo cambia estado y notas
        Insert: never;
        Update: Partial<Pick<OrderRow, "status" | "admin_notes" | "shipping" | "shipping_address">>;
        Relationships: [];
      };
      order_items: {
        Row: OrderItemRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      payments: {
        Row: PaymentRow;
        Insert: Omit<PaymentRow, "id" | "created_at" | "updated_at" | "raw" | "provider_payment_id" | "status"> &
          Partial<Pick<PaymentRow, "raw" | "provider_payment_id" | "status">>;
        Update: Partial<Pick<PaymentRow, "status" | "raw">>;
        Relationships: [];
      };
    };
    Views: {
      packages_with_items: {
        Row: PackageWithItemsRow;
        Relationships: [];
      };
    };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      /** Crea o actualiza un paquete y reemplaza su contenido (transacción). Devuelve el id. */
      admin_save_package: { Args: { p_package: Json; p_items: Json }; Returns: string };
      /** Crea un pedido con precios de la BD. Devuelve CreatedOrder (jsonb). */
      create_order: {
        Args: { p_items: Json; p_note?: string | null; p_channel?: "whatsapp" | "stripe"; p_currency?: string };
        Returns: Json;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
