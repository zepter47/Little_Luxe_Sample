import { mutationOptions, queryOptions, type QueryClient } from "@tanstack/react-query";
import { getSupplierCategoriesAsync, saveSupplierCategoryAsync } from "./supplier.api";
import { supplierKeys } from "./supplier.types";
import type { SupplierCategoryFormData } from "./supplierCategory.types";

export const getSupplierCategoriesQueryOption = () => queryOptions({queryKey: supplierKeys.categories, queryFn: getSupplierCategoriesAsync});
export const saveSupplierCategoryMutationOption = (client: QueryClient) => mutationOptions({
    mutationFn: ({id, values}: {id?: string; values: SupplierCategoryFormData}) => saveSupplierCategoryAsync(values, id),
    onSuccess: () => client.invalidateQueries({queryKey: supplierKeys.categories}),
});
