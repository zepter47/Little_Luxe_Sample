import { mutationOptions, queryOptions, type QueryClient } from "@tanstack/react-query";
import { getUnitsAsync, saveUnitAsync } from "./unit.api";
import { unitKeys, type UnitFormData } from "./unit.types";

export const getUnitsQueryOption = () => queryOptions({queryKey: unitKeys.all, queryFn: getUnitsAsync});
export const saveUnitMutationOption = (client: QueryClient) => mutationOptions({
    mutationFn: ({id, values}: {id?: string; values: UnitFormData}) => saveUnitAsync({
        uom_id: id, uom_name: values.uom_name, uom_notes: values.uom_notes,
    }),
    onSuccess: () => client.invalidateQueries({queryKey: unitKeys.all}),
});
