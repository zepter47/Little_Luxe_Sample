import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { getItemsAsync, saveItemAsync } from "./item.api";
import { itemKeys } from "./item.types";

export const getItemsQueryOption = () => queryOptions({
    queryKey: itemKeys.all, queryFn: getItemsAsync,
});
export const saveItemMutationOption = () => mutationOptions({
    mutationFn: saveItemAsync,
});

