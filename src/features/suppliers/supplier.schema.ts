import { z } from "zod";

export const supplierSchema = z.object({
    supplier_name: z.string().trim().min(1, "Please enter supplier name."),
    supplier_cat_id: z.uuid("Please select a supplier category."),
    supplier_email: z.string().trim().pipe(z.union([z.literal(""), z.email("Enter a valid email address.")])),
    supplier_contact: z.string().trim(),
    supplier_address: z.string().trim(),
    supplier_notes: z.string().trim(),
});
