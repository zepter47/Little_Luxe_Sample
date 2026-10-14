export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cart: {
        Row: {
          batch_number: string | null
          cart_id: string
          expiry_date: string | null
          item_id: string
          quanity_in_cart: number | null
          sale_price: number | null
        }
        Insert: {
          batch_number?: string | null
          cart_id: string
          expiry_date?: string | null
          item_id: string
          quanity_in_cart?: number | null
          sale_price?: number | null
        }
        Update: {
          batch_number?: string | null
          cart_id?: string
          expiry_date?: string | null
          item_id?: string
          quanity_in_cart?: number | null
          sale_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_cart_item"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item"
            referencedColumns: ["item_id"]
          },
        ]
      }
      games: {
        Row: {
          created_at: string | null
          description: string | null
          developer: string | null
          game_id: number
          game_name: string
          genre: string | null
          image_url: string | null
          is_available: boolean | null
          language: string | null
          price: number
          publisher: string | null
          rating: number | null
          release_date: string | null
          stock_quantity: number | null
          system_requirements: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          developer?: string | null
          game_id?: number
          game_name: string
          genre?: string | null
          image_url?: string | null
          is_available?: boolean | null
          language?: string | null
          price: number
          publisher?: string | null
          rating?: number | null
          release_date?: string | null
          stock_quantity?: number | null
          system_requirements?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          developer?: string | null
          game_id?: number
          game_name?: string
          genre?: string | null
          image_url?: string | null
          is_available?: boolean | null
          language?: string | null
          price?: number
          publisher?: string | null
          rating?: number | null
          release_date?: string | null
          stock_quantity?: number | null
          system_requirements?: string | null
        }
        Relationships: []
      }
      item: {
        Row: {
          updated_on: string | null
          updated_by: string | null
          is_active: boolean | null
          added_by: string | null
          added_on: string | null
          image_path: string | null
          item_category_id: string | null
          item_id: string
          item_name: string
          max_stock: number | null
          min_stock: number | null
          product_notes: string | null
          sale_price: number
          uom_id: string | null
        }
        Insert: {
          updated_on?: string | null
          updated_by?: string | null
          is_active?: boolean | null
          added_by?: string | null
          added_on?: string | null
          image_path?: string | null
          item_category_id?: string | null
          item_id?: string
          item_name: string
          max_stock?: number | null
          min_stock?: number | null
          product_notes?: string | null
          sale_price: number
          uom_id?: string | null
        }
        Update: {
          updated_on?: string | null
          updated_by?: string | null
          is_active?: boolean | null
          added_by?: string | null
          added_on?: string | null
          image_path?: string | null
          item_category_id?: string | null
          item_id?: string
          item_name?: string
          max_stock?: number | null
          min_stock?: number | null
          product_notes?: string | null
          sale_price?: number
          uom_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_item_category"
            columns: ["item_category_id"]
            isOneToOne: false
            referencedRelation: "item_category"
            referencedColumns: ["item_category_id"]
          },
          {
            foreignKeyName: "fk_item_uom"
            columns: ["uom_id"]
            isOneToOne: false
            referencedRelation: "unit_of_measure"
            referencedColumns: ["uom_id"]
          },
        ]
      }
      item_images: {
        Row: { image_id: string; item_id: string; storage_path: string | null }
        Insert: { image_id: string; item_id: string; storage_path?: string | null }
        Update: { image_id?: string; item_id?: string; storage_path?: string | null }
        Relationships: [{
          foreignKeyName: "item_images_item_id_fkey"
          columns: ["item_id"]
          isOneToOne: false
          referencedRelation: "item"
          referencedColumns: ["item_id"]
        }]
      }
      item_category: {
        Row: {
          category_name: string
          category_notes: string | null
          item_category_id: string
        }
        Insert: {
          category_name: string
          category_notes?: string | null
          item_category_id?: string
        }
        Update: {
          category_name?: string
          category_notes?: string | null
          item_category_id?: string
        }
        Relationships: []
      }
      item_return: {
        Row: {
          added_by: string | null
          added_on: string | null
          return_id: string
          return_notes: string | null
          sale_id: string | null
        }
        Insert: {
          added_by?: string | null
          added_on?: string | null
          return_id: string
          return_notes?: string | null
          sale_id?: string | null
        }
        Update: {
          added_by?: string | null
          added_on?: string | null
          return_id?: string
          return_notes?: string | null
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_return_sale"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sale"
            referencedColumns: ["sale_id"]
          },
        ]
      }
      purchase: {
        Row: {
          added_by: string | null
          added_on: string | null
          invoice_number: string
          purchase_id: string
          purchase_notes: string | null
          supplier_id: string | null
        }
        Insert: {
          added_by?: string | null
          added_on?: string | null
          invoice_number: string
          purchase_id: string
          purchase_notes?: string | null
          supplier_id?: string | null
        }
        Update: {
          added_by?: string | null
          added_on?: string | null
          invoice_number?: string
          purchase_id?: string
          purchase_notes?: string | null
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_purchase_supplier"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "supplier"
            referencedColumns: ["supplier_id"]
          },
        ]
      }
      purchase_details: {
        Row: {
          batch_number: string | null
          cost_price: number
          expiry_date: string | null
          item_id: string
          purchase_details_id: string
          purchase_id: string
          quantity_bought: number
        }
        Insert: {
          batch_number?: string | null
          cost_price: number
          expiry_date?: string | null
          item_id: string
          purchase_details_id: string
          purchase_id: string
          quantity_bought: number
        }
        Update: {
          batch_number?: string | null
          cost_price?: number
          expiry_date?: string | null
          item_id?: string
          purchase_details_id?: string
          purchase_id?: string
          quantity_bought?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_purch_details_item"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "fk_purch_details_parent"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchase"
            referencedColumns: ["purchase_id"]
          },
        ]
      }
      return_details: {
        Row: {
          batch_number: string | null
          expiry_date: string | null
          item_id: string
          quantity_returned: number | null
          return_details_id: string
          return_id: string | null
        }
        Insert: {
          batch_number?: string | null
          expiry_date?: string | null
          item_id: string
          quantity_returned?: number | null
          return_details_id: string
          return_id?: string | null
        }
        Update: {
          batch_number?: string | null
          expiry_date?: string | null
          item_id?: string
          quantity_returned?: number | null
          return_details_id?: string
          return_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_ret_details_item"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "fk_ret_details_parent"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "item_return"
            referencedColumns: ["return_id"]
          },
        ]
      }
      sale: {
        Row: {
          added_by: string | null
          added_on: string | null
          sale_id: string
          sale_notes: string | null
          sale_status_id: string | null
        }
        Insert: {
          added_by?: string | null
          added_on?: string | null
          sale_id: string
          sale_notes?: string | null
          sale_status_id?: string | null
        }
        Update: {
          added_by?: string | null
          added_on?: string | null
          sale_id?: string
          sale_notes?: string | null
          sale_status_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sale_status"
            columns: ["sale_status_id"]
            isOneToOne: false
            referencedRelation: "sale_status"
            referencedColumns: ["sale_status_id"]
          },
        ]
      }
      sale_details: {
        Row: {
          batch_number: string | null
          expiry_date: string | null
          item_id: string | null
          quantity_sold: number | null
          sale_details_id: string
          sale_id: string | null
          sale_price: number | null
        }
        Insert: {
          batch_number?: string | null
          expiry_date?: string | null
          item_id?: string | null
          quantity_sold?: number | null
          sale_details_id: string
          sale_id?: string | null
          sale_price?: number | null
        }
        Update: {
          batch_number?: string | null
          expiry_date?: string | null
          item_id?: string | null
          quantity_sold?: number | null
          sale_details_id?: string
          sale_id?: string | null
          sale_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sale_details_item"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item"
            referencedColumns: ["item_id"]
          },
          {
            foreignKeyName: "fk_sale_details_parent"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sale"
            referencedColumns: ["sale_id"]
          },
        ]
      }
      sale_status: {
        Row: {
          sale_status_id: string
          status_name: string
          status_notes: string | null
        }
        Insert: {
          sale_status_id: string
          status_name: string
          status_notes?: string | null
        }
        Update: {
          sale_status_id?: string
          status_name?: string
          status_notes?: string | null
        }
        Relationships: []
      }
      stock: {
        Row: {
          batch_number: string | null
          expiry_date: string | null
          item_id: string
          quantity_at_hand: number | null
          stock_id: string
        }
        Insert: {
          batch_number?: string | null
          expiry_date?: string | null
          item_id: string
          quantity_at_hand?: number | null
          stock_id: string
        }
        Update: {
          batch_number?: string | null
          expiry_date?: string | null
          item_id?: string
          quantity_at_hand?: number | null
          stock_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_stock_item"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item"
            referencedColumns: ["item_id"]
          },
        ]
      }
      supplier: {
        Row: {
          added_by: string | null
          added_on: string | null
          supplier_address: string | null
          supplier_cat_id: string
          supplier_contact: string | null
          supplier_email: string | null
          supplier_id: string
          supplier_name: string
          supplier_notes: string | null
        }
        Insert: {
          added_by?: string | null
          added_on?: string | null
          supplier_address?: string | null
          supplier_cat_id: string
          supplier_contact?: string | null
          supplier_email?: string | null
          supplier_id: string
          supplier_name: string
          supplier_notes?: string | null
        }
        Update: {
          added_by?: string | null
          added_on?: string | null
          supplier_address?: string | null
          supplier_cat_id?: string
          supplier_contact?: string | null
          supplier_email?: string | null
          supplier_id?: string
          supplier_name?: string
          supplier_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_supplier_category"
            columns: ["supplier_cat_id"]
            isOneToOne: false
            referencedRelation: "supplier_category"
            referencedColumns: ["supplier_category_id"]
          },
        ]
      }
      supplier_category: {
        Row: {
          category_name: string
          category_notes: string | null
          supplier_category_id: string
        }
        Insert: {
          category_name: string
          category_notes?: string | null
          supplier_category_id: string
        }
        Update: {
          category_name?: string
          category_notes?: string | null
          supplier_category_id?: string
        }
        Relationships: []
      }
      unit_of_measure: {
        Row: {
          uom_id: string
          uom_name: string
          uom_notes: string | null
        }
        Insert: {
          uom_id?: string
          uom_name: string
          uom_notes?: string | null
        }
        Update: {
          uom_id?: string
          uom_name?: string
          uom_notes?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_item_with_category_name: {
        Args: {
          p_added_by: string
          p_category_name: string
          p_cost_price: number
          p_image_path: string
          p_item_name: string
          p_max_stock: number
          p_min_stock: number
          p_product_notes: string
          p_sale_price: number
          p_uom_name: string
        }
        Returns: string
      }
      process_secure_purchase: {
        Args: {
          p_invoice_number: string
          p_items_json: Json
          p_purchase_notes: string
          p_supplier_name: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
