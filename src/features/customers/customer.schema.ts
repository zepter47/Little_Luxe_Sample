import { z } from "zod";

export const customerSchema = z.object({
    first_name: z.string().trim().min(1, "Please enter first name."),
    last_name: z.string().trim().min(1, "Please enter last name."),
    email: z.string().trim().pipe(z.union([z.literal(""), z.email("Enter a valid email address.")])),
    phone_number: z.string().trim(),
    address: z.string().trim(),
    customer_notes: z.string().trim(),
    is_active: z.boolean(),
});
