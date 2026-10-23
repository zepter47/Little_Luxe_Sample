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
          added_by: string | null
          added_on: string | null
          image_path: string | null
          is_active: boolean
          is_stocked: boolean | null
          item_category_id: string | null
          item_id: string
          item_name: string
          max_stock: number | null
          min_stock: number | null
          product_notes: string | null
          sale_price: number
          uom_id: string | null
          updated_by: string | null
          updated_on: string | null
        }
        Insert: {
          added_by?: string | null
          added_on?: string | null
          image_path?: string | null
          is_active?: boolean
          is_stocked?: boolean | null
          item_category_id?: string | null
          item_id?: string
          item_name: string
          max_stock?: number | null
          min_stock?: number | null
          product_notes?: string | null
          sale_price: number
          uom_id?: string | null
          updated_by?: string | null
          updated_on?: string | null
        }
        Update: {
          added_by?: string | null
          added_on?: string | null
          image_path?: string | null
          is_active?: boolean
          is_stocked?: boolean | null
          item_category_id?: string | null
          item_id?: string
          item_name?: string
          max_stock?: number | null
          min_stock?: number | null
          product_notes?: string | null
          sale_price?: number
          uom_id?: string | null
          updated_by?: string | null
          updated_on?: string | null
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
      item_category: {
        Row: {
          added_by: string | null
          added_on: string | null
          category_name: string
          category_notes: string | null
          is_active: boolean | null
          item_category_id: string
          updated_by: string | null
          updated_on: string | null
        }
        Insert: {
          added_by?: string | null
          added_on?: string | null
          category_name: string
          category_notes?: string | null
          is_active?: boolean | null
          item_category_id?: string
          updated_by?: string | null
          updated_on?: string | null
        }
        Update: {
          added_by?: string | null
          added_on?: string | null
          category_name?: string
          category_notes?: string | null
          is_active?: boolean | null
          item_category_id?: string
          updated_by?: string | null
          updated_on?: string | null
        }
        Relationships: []
      }
      item_images: {
        Row: {
          image_id: string
          item_id: string
          storage_path: string | null
        }
        Insert: {
          image_id: string
          item_id: string
          storage_path?: string | null
        }
        Update: {
          image_id?: string
          item_id?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_images_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item"
            referencedColumns: ["item_id"]
          },
        ]
      }
      item_return: {
        Row: {
          added_by: string | null
          added_on: string | null
          is_active: boolean | null
          order_id: string | null
          return_id: string
          return_notes: string | null
          return_status: Database["public"]["Enums"]["return_status"] | null
          updated_by: string | null
          updated_on: string | null
        }
        Insert: {
          added_by?: string | null
          added_on?: string | null
          is_active?: boolean | null
          order_id?: string | null
          return_id?: string
          return_notes?: string | null
          return_status?: Database["public"]["Enums"]["return_status"] | null
          updated_by?: string | null
          updated_on?: string | null
        }
        Update: {
          added_by?: string | null
          added_on?: string | null
          is_active?: boolean | null
          order_id?: string | null
          return_id?: string
          return_notes?: string | null
          return_status?: Database["public"]["Enums"]["return_status"] | null
          updated_by?: string | null
          updated_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_return_sale"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order"
            referencedColumns: ["order_id"]
          },
        ]
      }
      order: {
        Row: {
          added_by: string | null
          added_on: string | null
          is_active: boolean | null
          order_id: string
          order_notes: string | null
          order_status: Database["public"]["Enums"]["order_status"] | null
          updated_by: string | null
          updated_on: string | null
        }
        Insert: {
          added_by?: string | null
          added_on?: string | null
          is_active?: boolean | null
          order_id?: string
          order_notes?: string | null
          order_status?: Database["public"]["Enums"]["order_status"] | null
          updated_by?: string | null
          updated_on?: string | null
        }
        Update: {
          added_by?: string | null
          added_on?: string | null
          is_active?: boolean | null
          order_id?: string
          order_notes?: string | null
          order_status?: Database["public"]["Enums"]["order_status"] | null
          updated_by?: string | null
          updated_on?: string | null
        }
        Relationships: []
      }
      order_details: {
        Row: {
          batch_number: string | null
          expiry_date: string | null
          item_id: string | null
          order_details_id: string
          order_id: string | null
          quantity_sold: number | null
          sale_price: number | null
        }
        Insert: {
          batch_number?: string | null
          expiry_date?: string | null
          item_id?: string | null
          order_details_id?: string
          order_id?: string | null
          quantity_sold?: number | null
          sale_price?: number | null
        }
        Update: {
          batch_number?: string | null
          expiry_date?: string | null
          item_id?: string | null
          order_details_id?: string
          order_id?: string | null
          quantity_sold?: number | null
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
            foreignKeyName: "sale_details_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order"
            referencedColumns: ["order_id"]
          },
        ]
      }
      purchase: {
        Row: {
          added_by: string | null
          added_on: string | null
          invoice_number: string
          is_active: boolean | null
          purchase_id: string
          purchase_notes: string | null
          supplier_id: string | null
          updated_by: string | null
          updated_on: string | null
        }
        Insert: {
          added_by?: string | null
          added_on?: string | null
          invoice_number: string
          is_active?: boolean | null
          purchase_id?: string
          purchase_notes?: string | null
          supplier_id?: string | null
          updated_by?: string | null
          updated_on?: string | null
        }
        Update: {
          added_by?: string | null
          added_on?: string | null
          invoice_number?: string
          is_active?: boolean | null
          purchase_id?: string
          purchase_notes?: string | null
          supplier_id?: string | null
          updated_by?: string | null
          updated_on?: string | null
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
          purchase_details_id?: string
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
      role_permissions: {
        Row: {
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          permission: Database["public"]["Enums"]["app_permission"]
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          permission?: Database["public"]["Enums"]["app_permission"]
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      stock: {
        Row: {
          batch_number: string | null
          cost_price: number
          expiry_date: string | null
          item_id: string
          quantity_at_hand: number | null
          stock_id: string
        }
        Insert: {
          batch_number?: string | null
          cost_price: number
          expiry_date?: string | null
          item_id: string
          quantity_at_hand?: number | null
          stock_id: string
        }
        Update: {
          batch_number?: string | null
          cost_price?: number
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
          is_active: boolean | null
          supplier_address: string | null
          supplier_cat_id: string
          supplier_contact: string | null
          supplier_email: string | null
          supplier_id: string
          supplier_name: string
          supplier_notes: string | null
          updated_by: string | null
          updated_on: string | null
        }
        Insert: {
          added_by?: string | null
          added_on?: string | null
          is_active?: boolean | null
          supplier_address?: string | null
          supplier_cat_id: string
          supplier_contact?: string | null
          supplier_email?: string | null
          supplier_id?: string
          supplier_name: string
          supplier_notes?: string | null
          updated_by?: string | null
          updated_on?: string | null
        }
        Update: {
          added_by?: string | null
          added_on?: string | null
          is_active?: boolean | null
          supplier_address?: string | null
          supplier_cat_id?: string
          supplier_contact?: string | null
          supplier_email?: string | null
          supplier_id?: string
          supplier_name?: string
          supplier_notes?: string | null
          updated_by?: string | null
          updated_on?: string | null
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
          added_by: string | null
          added_on: string | null
          category_name: string
          category_notes: string | null
          is_active: boolean | null
          supplier_category_id: string
          updated_by: string | null
          updated_on: string | null
        }
        Insert: {
          added_by?: string | null
          added_on?: string | null
          category_name: string
          category_notes?: string | null
          is_active?: boolean | null
          supplier_category_id?: string
          updated_by?: string | null
          updated_on?: string | null
        }
        Update: {
          added_by?: string | null
          added_on?: string | null
          category_name?: string
          category_notes?: string | null
          is_active?: boolean | null
          supplier_category_id?: string
          updated_by?: string | null
          updated_on?: string | null
        }
        Relationships: []
      }
      unit_of_measure: {
        Row: {
          added_by: string | null
          added_on: string | null
          is_active: boolean | null
          uom_id: string
          uom_name: string
          uom_notes: string | null
          updated_by: string | null
          updated_on: string | null
        }
        Insert: {
          added_by?: string | null
          added_on?: string | null
          is_active?: boolean | null
          uom_id?: string
          uom_name: string
          uom_notes?: string | null
          updated_by?: string | null
          updated_on?: string | null
        }
        Update: {
          added_by?: string | null
          added_on?: string | null
          is_active?: boolean | null
          uom_id?: string
          uom_name?: string
          uom_notes?: string | null
          updated_by?: string | null
          updated_on?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_purchase: {
        Args: {
          p_invoice_number: string
          p_items_json: Json
          p_supplier_id?: string
          p_purchase_notes?: string
          p_added_on?: string
        }
        Returns: string
      }
      save_item: {
        Args: {
          p_category_id: string
          p_image_path?: string
          p_is_active?: boolean
          p_item_id?: string
          p_item_name: string
          p_product_notes: string
          p_sale_price: number
          p_uom_id: string
        }
        Returns: string
      }
      get_admin_items_with_stock: {
        Args: { p_include_inactive?: boolean }
        Returns: {
          image_path: string
          is_active: boolean
          is_stocked: boolean
          item_category_id: string
          item_id: string
          item_name: string
          product_notes: string
          quantity_on_hand: number
          sale_price: number
          uom_id: string
        }[]
      }
      get_storefront_items: {
        Args: never
        Returns: {
          image_path: string
          is_active: boolean
          is_stocked: boolean
          item_category_id: string
          item_id: string
          item_name: string
          product_notes: string
          sale_price: number
        }[]
      }
      cart_checkout: {
        Args: { p_items: Json; p_request_id: string; p_confirm: boolean }
        Returns: Json
      }

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
      authorize: {
        Args: {
          requested_permission: Database["public"]["Enums"]["app_permission"]
        }
        Returns: boolean
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
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
      app_permission:
        | "products.read"
        | "products.create"
        | "products.update"
        | "products.delete"
        | "categories.read"
        | "categories.create"
        | "categories.update"
        | "images.create"
        | "UOM.read"
        | "UOM.create"
        | "UOM.update"
        | "UOM.delete"
        | "categories.delete"
        | "suppliers.read"
        | "suppliers.create"
        | "suppliers.update"
        | "suppliers.delete"
        | "supplier_categories.read"
        | "supplier_categories.create"
        | "supplier_categories.update"
        | "supplier_categories.delete"
        | "purchases.read"
        | "purchases.create"
        | "purchases.update"
        | "purchases.delete"
        | "purchase_details.read"
        | "purchase_details.create"
        | "purchase_details.update"
        | "purchase_details.delete"
        | "orders.read"
        | "orders.create"
        | "orders.update"
        | "orders.delete"
        | "order_details.read"
        | "order_details.create"
        | "order_details.update"
        | "order_details.delete"
        | "item_returns.read"
        | "item_returns.create"
        | "item_returns.update"
        | "item_returns.delete"
        | "return_details.read"
        | "return_details.create"
        | "return_details.update"
        | "return_details.delete"
        | "stock.read"
        | "stock.create"
        | "stock.update"
        | "stock.delete"
        | "item_images.read"
        | "item_images.create"
        | "item_images.update"
        | "item_images.delete"
      app_role: "customer" | "staff" | "admin"
      order_status:
        | "received"
        | "processed"
        | "shipped"
        | "delivered"
        | "declined"
      return_status: "received" | "processed" | "authorized" | "declined"
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
    Enums: {
      app_permission: [
        "products.read",
        "products.create",
        "products.update",
        "products.delete",
        "categories.read",
        "categories.create",
        "categories.update",
        "images.create",
        "UOM.read",
        "UOM.create",
        "UOM.update",
        "UOM.delete",
        "categories.delete",
        "suppliers.read",
        "suppliers.create",
        "suppliers.update",
        "suppliers.delete",
        "supplier_categories.read",
        "supplier_categories.create",
        "supplier_categories.update",
        "supplier_categories.delete",
        "purchases.read",
        "purchases.create",
        "purchases.update",
        "purchases.delete",
        "purchase_details.read",
        "purchase_details.create",
        "purchase_details.update",
        "purchase_details.delete",
        "orders.read",
        "orders.create",
        "orders.update",
        "orders.delete",
        "order_details.read",
        "order_details.create",
        "order_details.update",
        "order_details.delete",
        "item_returns.read",
        "item_returns.create",
        "item_returns.update",
        "item_returns.delete",
        "return_details.read",
        "return_details.create",
        "return_details.update",
        "return_details.delete",
        "stock.read",
        "stock.create",
        "stock.update",
        "stock.delete",
        "item_images.read",
        "item_images.create",
        "item_images.update",
        "item_images.delete",
      ],
      app_role: ["customer", "staff", "admin"],
      order_status: [
        "received",
        "processed",
        "shipped",
        "delivered",
        "declined",
      ],
      return_status: ["received", "processed", "authorized", "declined"],
    },
  },
} as const
