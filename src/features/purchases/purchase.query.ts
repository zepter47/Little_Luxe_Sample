import { mutationOptions, type QueryClient } from '@tanstack/react-query';
import { itemKeys } from '../items/item.types';
import { createPurchaseAsync } from './purchase.api';
import { purchaseKeys } from './purchase.types';

export const createPurchaseMutationOption = (queryClient: QueryClient) => mutationOptions({
    mutationFn: createPurchaseAsync,
    retry: false,
    onSuccess: async id => {
        await Promise.all([
            queryClient.invalidateQueries({queryKey: purchaseKeys.all}),
            queryClient.invalidateQueries({queryKey: purchaseKeys.details(id)}),
            queryClient.invalidateQueries({queryKey: ['stock-options']}),
            queryClient.invalidateQueries({queryKey: itemKeys.all}),
        ]);
    },
});
