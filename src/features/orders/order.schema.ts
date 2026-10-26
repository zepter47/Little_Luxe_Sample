import { z } from "zod";
export const orderItemsSchema = z
  .array(
    z.object({
      item_id: z.uuid(),
      quantity: z.number().int().min(1).max(999),
      sale_price: z.number().finite().nonnegative(),
    }),
  )
  .min(1)
  .max(100)
  .refine(
    (items) => new Set(items.map((i) => i.item_id)).size === items.length,
    "Each item may appear only once.",
  );
