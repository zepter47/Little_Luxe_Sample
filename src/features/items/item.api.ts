import { supabase } from "../../lib/supabase";
import type { newItem } from "./item.types";

export async function getItemsAsync() {
    const {data, error} = await supabase.from("item").select("*").order("item_name");
    if (error) throw error;
    return data;
}

export async function saveItemAsync(item: newItem) {
    const request = item.item_id
        ? supabase.from("item").update(item).eq("item_id", item.item_id)
        : supabase.from("item").insert(item);
    const {data, error} = await request.select().single();
    if (error) throw error;
    return data;
}

