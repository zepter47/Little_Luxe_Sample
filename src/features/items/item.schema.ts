import { z } from "zod";

export const itemSchema = z.object({
    item_name: z.string().trim().min(1, "Enter an item name"),
    sale_price: z.number().min(0, "Price cannot be negative"),
    cost_price: z.number().min(0, "Cost cannot be negative"),
    item_category_id: z.string(),
    product_notes: z.string().trim(),
    image_path: z.string().refine(value => !value || /^https?:\/\//i.test(value) || /^data:image\/(png|jpeg|webp);base64,/.test(value), "Use an HTTP image URL or upload an image"),
});

