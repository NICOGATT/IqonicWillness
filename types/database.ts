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
    };
    Views: { [_ in never]: never };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
