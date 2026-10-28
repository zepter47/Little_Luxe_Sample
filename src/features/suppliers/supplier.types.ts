import type { z } from "zod";
import type { Tables, TablesInsert } from "../../database.types";
import type { supplierSchema } from "./supplier.schema";
export type supplier = Tables<"supplier">;
export type newSupplier = TablesInsert<"supplier">;
export type Supplier = supplier;
export type SupplierFormData = z.infer<typeof supplierSchema>;
export const supplierKeys = {all: ["suppliers"] as const, categories: ["supplier-categories"] as const};
