import type { Tables, TablesInsert } from "../../database.types";
export type supplier = Tables<"supplier">;
export type newSupplier = TablesInsert<"supplier">;
export const supplierKeys = {all: ["suppliers"] as const, categories: ["supplier-categories"] as const};

