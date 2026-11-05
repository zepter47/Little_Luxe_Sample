import { z } from "zod";

export const itemSchema = z.object({
    is_active: z.boolean(),
    item_name: z.string().trim().min(1, "Enter an item name"),
    sale_price: z.number().int("Enter whole Uganda shillings").min(0, "Price cannot be negative").max(Number.MAX_SAFE_INTEGER),
    item_discount: z.number().int("Discount must be a whole percentage").min(0).max(100),
    item_category_id: z.string(),
    product_notes: z.string().trim(),
    uom_id: z.string().uuid("Select a unit of measure"),
});
