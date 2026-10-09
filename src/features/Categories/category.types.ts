import { z } from "zod";
import { categorySchema } from "./category.schema";
import type { Tables, TablesInsert, TablesUpdate } from "../../database.types";





export type categoryData = z.infer<typeof categorySchema>;

export type categoryFormData = Pick<z.infer<typeof categorySchema>, 
                                "category"| "categoryDescription">;

 
export type category = Tables<"item_category">;

export type newCategory = TablesInsert<"item_category">;

export type updateCategory = TablesUpdate<"item_category">;

export const categoryKeys = {
    categoryNamesKey: ['category', 'names']
};