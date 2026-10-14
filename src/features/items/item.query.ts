import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { getItemsAsync, saveItemAsync, getItemAsync } from "./item.api";
import { getItemGalleryImages } from "../../services/itemImages";
import { itemKeys } from "./item.types";

export const getItemsQueryOption = () => queryOptions({
    queryKey: itemKeys.all, queryFn: getItemsAsync,
});
export const saveItemMutationOption = () => mutationOptions({
    mutationFn: saveItemAsync,
});


export const getItemQueryOption = (itemId: string) => queryOptions({
    queryKey: [...itemKeys.all, "detail", itemId], queryFn: () => getItemAsync(itemId),
});
export const getItemImagesQueryOption = (itemId: string) => queryOptions({
    queryKey: [...itemKeys.all, "detail", itemId, "images"], queryFn: () => getItemGalleryImages(itemId),
});
