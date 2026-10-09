import { z } from "zod";

export const ProductShcema = z.object({
    id: z.number().optional(),
    name: z.string().nonempty("The productso name is required"),
    price: z.number().min(1, "The product price must be indicated").nonnegative("The price can not be negative"),
    description: z.string("Only words are accepted")
});