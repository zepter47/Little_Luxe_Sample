import type { Database, Tables, TablesInsert } from "../../database.types";
import type { z } from "zod";
import { itemSchema } from "./item.schema";

export type item = Tables<"item">;
export type newItem = TablesInsert<"item">;
export type itemFormData = z.infer<typeof itemSchema>;
export type AdminItem = Pick<item, "item_id" | "item_name" | "sale_price" | "item_category_id" | "uom_id" | "image_path" | "product_notes" | "is_active" | "is_stocked"> & {quantity_on_hand: number};
export type StorefrontItem = Pick<item, "item_id" | "item_name" | "sale_price" | "item_category_id" | "image_path" | "product_notes" | "is_active" | "is_stocked">;
export type CartProduct = Pick<item, "item_id" | "item_name" | "sale_price" | "image_path" | "is_active" | "is_stocked">;
export type SaveItemInput = Omit<Database["public"]["Functions"]["save_item"]["Args"], "p_category_id"> & {p_category_id: string | null};
export const itemKeys = {
    all: ["items"] as const,
    storefront: ["items", "storefront"] as const,
    admin: (includeInactive: boolean, userId: string) => ["items", "admin", userId, {includeInactive}] as const,
};

