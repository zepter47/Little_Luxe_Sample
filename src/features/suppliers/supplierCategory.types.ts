import type { z } from "zod";
import type { Tables } from "../../database.types";
import type { supplierCategorySchema } from "./supplierCategory.schema";
export type SupplierCategory = Tables<"supplier_category">;
export type SupplierCategoryFormData = z.infer<typeof supplierCategorySchema>;
