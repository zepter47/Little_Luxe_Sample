import { z } from "zod";
export const orderItemsSchema = z
  .array(
    z.object({
      item_id: z.uuid("Select an item."),
      quantity: z.number({error: "Enter a quantity."}).int("Quantity must be a whole number.")
        .min(1, "Quantity must be between 1 and 999.").max(999, "Quantity must be between 1 and 999."),
      sale_price: z.number().finite().nonnegative(),
    }),
  )
  .min(1)
  .max(100)
  .refine(
    (items) => new Set(items.map((i) => i.item_id)).size === items.length,
    "Each item may appear only once.",
  );

export const staffOrderSchema = z.object({
  customer_id: z.uuid("Select a customer."),
  items: orderItemsSchema,
  notes: z.string().trim(),
});

export const orderStatusSchema = z.object({
  status: z.enum(["received", "processed", "shipped", "delivered", "declined"]),
  reason: z.string().trim(),
}).superRefine((values, context) => {
  if (values.status === "declined" && !values.reason) {
    context.addIssue({code: "custom", path: ["reason"], message: "Enter a reason for declining this order."});
  }
});
