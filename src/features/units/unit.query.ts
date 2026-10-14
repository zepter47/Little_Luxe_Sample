import { getUnitsAsync } from "./unit.api";
import { queryOptions } from "@tanstack/react-query";
import type { Tables } from "../../database.types";

export type Unit = Tables<"unit_of_measure">;
export const unitKeys = {all: ["units"] as const};
export const getUnitsQueryOption = () => queryOptions({
    queryKey: unitKeys.all, queryFn: getUnitsAsync,
});
