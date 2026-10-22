import { supabase } from "../../lib/supabase";
import type { Database } from "../../database.types";
import type { AdminItem, SaveItemInput, StorefrontItem } from "./item.types";

export async function getItemsAsync(): Promise<StorefrontItem[]> {
    const {data, error} = await supabase.rpc("get_storefront_items");
    if (error) throw error;
    return data;
}

export async function getAdminItemsAsync(includeInactive: boolean): Promise<AdminItem[]> {
    const {data, error} = await supabase.rpc("get_admin_items_with_stock", {p_include_inactive: includeInactive});
    if (error) throw error;
    return data;
}

export async function saveItemAsync(item: SaveItemInput) {
    // SQL accepts a null category; the Supabase generator omits argument nullability.
    const {data, error} = await supabase.rpc("save_item", item as Database["public"]["Functions"]["save_item"]["Args"]);
    if (error) throw error;
    return data;
}

export async function getItemAsync(itemId: string): Promise<StorefrontItem | null> {
    const {data, error} = await supabase.rpc("get_storefront_items").eq("item_id", itemId).maybeSingle();
    if (error) throw error;
    return data;
}
