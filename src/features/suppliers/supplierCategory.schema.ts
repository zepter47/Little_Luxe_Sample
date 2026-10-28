import { z } from "zod";

export const supplierCategorySchema = z.object({
    category_name: z.string().trim().min(1, "Please enter category name."),
    category_notes: z.string().trim(),
});
