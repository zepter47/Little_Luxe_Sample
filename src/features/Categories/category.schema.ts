import { z } from "zod";

export const categorySchema = z.object({
    category: z.string().min(1, "The category should be included"),
    categoryDescription: z.string()
});