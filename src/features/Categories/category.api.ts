import { supabase } from "../../lib/supabase";
import type { newCategory } from "../Categories/category.types";


//creating a new category 
export async function CreateCategoryAsync(category:newCategory){
    const{data, error} = await supabase.from("item_category")
                            .insert(category).select().single();

    if(error){
        throw error;
    }

    return data;
}

export async function getCategoryNameAsync() {
    const {data, error} = await supabase.from('item_category').select('*').order('category_name');
    if (error) throw error;
    return data;
}

export async function saveCategoryAsync(category: newCategory) {
    const request = category.item_category_id
        ? supabase.from('item_category').update(category).eq('item_category_id', category.item_category_id)
        : supabase.from('item_category').insert(category);
    const {data, error} = await request.select().single();
    if (error) throw error;
    return data;
}
