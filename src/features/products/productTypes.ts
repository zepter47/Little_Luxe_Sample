import { z } from "zod";
import type { ProductShcema } from "./productSchema";


export type ProductFormData = z.infer<typeof ProductShcema>