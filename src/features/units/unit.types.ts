import type { z } from "zod";
import type { Tables } from "../../database.types";
import type { unitSchema } from "./unit.schema";
export type Unit = Tables<"unit_of_measure">;
export type UnitFormData = z.infer<typeof unitSchema>;
export const unitKeys = {all: ["units"] as const};
