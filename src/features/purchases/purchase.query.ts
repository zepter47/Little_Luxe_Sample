import { mutationOptions, queryOptions, type QueryClient } from '@tanstack/react-query';
import { itemKeys } from '../items/item.types';
import { createPurchaseAsync, getPurchaseDetailsAsync, getPurchaseOptionsAsync, getPurchasePeopleAsync, getPurchasesAsync, updatePurchaseAsync } from './purchase.api';
import { purchaseKeys } from './purchase.types';

export const createPurchaseMutationOption = (queryClient: QueryClient) => mutationOptions({
    mutationFn: createPurchaseAsync,
    retry: false,
    onSuccess: async id => {
        await Promise.all([
            queryClient.invalidateQueries({queryKey: purchaseKeys.all}),
            queryClient.invalidateQueries({queryKey: purchaseKeys.details(id)}),
            queryClient.invalidateQueries({queryKey: itemKeys.all}),
        ]);
    },
});

export const getPurchasesQueryOption = () => queryOptions({queryKey: purchaseKeys.all, queryFn: getPurchasesAsync});
export const getPurchasePeopleQueryOption = (userId: string, ids: (string | null | undefined)[]) => {
    const unique = [...new Set(ids.filter((id): id is string => !!id))].sort();
    return queryOptions({queryKey: [...purchaseKeys.all, 'people', userId, unique],
        queryFn: () => getPurchasePeopleAsync(unique), enabled: !!userId && !!unique.length,
    });
};
export const getPurchaseDetailsQueryOption = (id: string) => queryOptions({
    queryKey: purchaseKeys.details(id), queryFn: () => getPurchaseDetailsAsync(id), enabled: !!id,
});
export const getPurchaseOptionsQueryOption = () => queryOptions({queryKey: purchaseKeys.options, queryFn: getPurchaseOptionsAsync});
export const updatePurchaseMutationOption = (client: QueryClient) => mutationOptions({
    mutationFn: updatePurchaseAsync,
    onSuccess: () => client.invalidateQueries({queryKey: purchaseKeys.all}),
});
