import { mutationOptions, queryOptions, type QueryClient } from "@tanstack/react-query";
import { getCategoryNameAsync, saveCategoryAsync } from "./category.api";
import { categoryKeys, type CategoryFormData } from "./category.types";

export const getCategoryNameQueryOption = () => queryOptions({
    queryKey: categoryKeys.categoryNamesKey, queryFn: getCategoryNameAsync,
});
export const saveCategoryMutationOption = (client: QueryClient) => mutationOptions({
    mutationFn: ({id, values}: {id?: string; values: CategoryFormData}) => saveCategoryAsync({
        item_category_id: id, category_name: values.category_name, category_notes: values.category_notes,
    }),
    onSuccess: () => client.invalidateQueries({queryKey: categoryKeys.categoryNamesKey}),
});
