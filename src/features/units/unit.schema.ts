import { z } from "zod";

export const unitSchema = z.object({
    uom_name: z.string().trim().min(1, "Please enter unit name."),
    uom_notes: z.string().trim(),
});
