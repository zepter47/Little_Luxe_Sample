import { supabase } from "../../lib/supabase";
import type { newSupplier } from "./supplier.types";

export async function getSuppliersAsync() {
    const {data, error} = await supabase.from("supplier").select("*").order("supplier_name");
    if (error) throw error;
    return data;
}
export async function getSupplierCategoriesAsync() {
    const {data, error} = await supabase.from("supplier_category").select("*").order("category_name");
    if (error) throw error;
    return data;
}
export async function saveSupplierAsync(supplier: newSupplier, editing: boolean) {
    const request = editing
        ? supabase.from("supplier").update(supplier).eq("supplier_id", supplier.supplier_id)
        : supabase.from("supplier").insert(supplier);
    const {data, error} = await request.select().single();
    if (error) throw error;
    return data;
}

export async function saveSupplierCategoryAsync(values: {category_name: string; category_notes: string}, id?: string) {
    const request = id
        ? supabase.from("supplier_category").update(values).eq("supplier_category_id", id)
        : supabase.from("supplier_category").insert({...values, supplier_category_id: crypto.randomUUID()});
    const {data, error} = await request.select().single();
    if (error) throw error;
    return data;
}

