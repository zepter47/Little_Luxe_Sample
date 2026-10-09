import type { Tables, TablesInsert } from "../../database.types";
import type { z } from "zod";
import { itemSchema } from "./item.schema";

export type item = Tables<"item">;
export type newItem = TablesInsert<"item">;
export type itemFormData = z.infer<typeof itemSchema>;
export const itemKeys = { all: ["items"] as const };

