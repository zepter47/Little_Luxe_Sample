import type { z } from "zod";
import type { Tables } from "../../database.types";
import type { customerSchema } from "./customer.schema";
export type Customer = Tables<"customer">;
export type CustomerFormData = z.infer<typeof customerSchema>;
export const customerKeys = {all: ["customers"] as const};
