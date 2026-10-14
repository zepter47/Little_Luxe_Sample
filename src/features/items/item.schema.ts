import { z } from "zod";

export const itemSchema = z.object({
    item_name: z.string().trim().min(1, "Enter an item name"),
    sale_price: z.number().min(0, "Price cannot be negative"),
    item_category_id: z.string(),
    product_notes: z.string().trim(),
    uom_id: z.string().uuid("Select a unit of measure"),
});
