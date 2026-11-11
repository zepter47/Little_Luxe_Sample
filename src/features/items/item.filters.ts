import type { StorefrontItem } from "./item.types";
import { discountedPrice } from "./item.pricing";

export type CollectionFilters = {
    categoryId: string;
    minPrice: string;
    maxPrice: string;
    discountedOnly: boolean;
};

export const emptyCollectionFilters: CollectionFilters = {
    categoryId: "", minPrice: "", maxPrice: "", discountedOnly: false,
};

export function priceRangeError({minPrice, maxPrice}: CollectionFilters): string | null {
    for (const price of [minPrice, maxPrice]) {
        if (price !== "" && (!Number.isSafeInteger(Number(price)) || Number(price) < 0))
            return "Enter whole, nonnegative UGX amounts.";
    }
    if (minPrice !== "" && maxPrice !== "" && Number(minPrice) > Number(maxPrice))
        return "Maximum price must be at least the minimum price.";
    return null;
}

/** Run only against submitted criteria; drafts never affect results or query keys. */
export function filterCollection(items: StorefrontItem[], name: string, filters: CollectionFilters) {
    const search = name.trim().toLocaleLowerCase();
    return items.filter(item => {
        if (search && !item.item_name.toLocaleLowerCase().includes(search)) return false;
        if (filters.categoryId && item.item_category_id !== filters.categoryId) return false;
        if (filters.discountedOnly && item.item_discount <= 0) return false;
        const price = discountedPrice(item.sale_price, item.item_discount);
        return (filters.minPrice === "" || price >= Number(filters.minPrice))
            && (filters.maxPrice === "" || price <= Number(filters.maxPrice));
    });
}
