import type { z } from "zod";
import type { Tables, TablesInsert, TablesUpdate } from "../../database.types";
import type { categorySchema } from "./category.schema";
export type category = Tables<"item_category">;
export type newCategory = TablesInsert<"item_category">;
export type updateCategory = TablesUpdate<"item_category">;
export type CategoryFormData = z.infer<typeof categorySchema>;
export const categoryKeys = {categoryNamesKey: ["category", "names"] as const};
