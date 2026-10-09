import { CreateCategoryAsync, getCategoryNameAsync } from "./category.api";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { categoryKeys } from "./category.types";

//Creating a category
export const addCategoryMutationOption = () => 
    mutationOptions({
        mutationFn: CreateCategoryAsync
    })

//Querying category to retrieve only the names column
export const getCategoryNameQueryOption = () =>
    queryOptions({
        queryKey: categoryKeys.categoryNamesKey,
        queryFn: getCategoryNameAsync
    })