import { supabase } from "../../lib/supabase";
import type { TablesInsert } from "../../database.types";

export async function getUnitsAsync() {
    const {data, error} = await supabase.from("unit_of_measure").select("*").order("uom_name");
    if (error) throw error;
    return data;
}

export async function saveUnitAsync(unit: TablesInsert<"unit_of_measure">) {
    const request = unit.uom_id
        ? supabase.from("unit_of_measure").update(unit).eq("uom_id", unit.uom_id)
        : supabase.from("unit_of_measure").insert(unit);
    const {data, error} = await request.select().single();
    if (error) throw error;
    return data;
}
