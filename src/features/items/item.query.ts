import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { getItemsAsync, saveItemAsync, getItemAsync, getAdminItemsAsync } from "./item.api";
import { getItemGalleryImages } from "../../services/itemImages";
import { itemKeys } from "./item.types";

export const getItemsQueryOption = () => queryOptions({
    queryKey: itemKeys.storefront, queryFn: getItemsAsync,
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

export const getAdminItemsQueryOption = (includeInactive: boolean, userId: string) => queryOptions({
    queryKey: itemKeys.admin(includeInactive, userId), queryFn: () => getAdminItemsAsync(includeInactive), enabled: !!userId,
});
