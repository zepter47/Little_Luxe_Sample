import { mutationOptions, queryOptions, type QueryClient } from "@tanstack/react-query";
import { getCustomers, saveCustomer } from "./customer.api";
import { customerKeys, type CustomerFormData } from "./customer.types";
import { orderKeys } from "../orders/order.types";

export const getCustomersQueryOption = () => queryOptions({queryKey: customerKeys.all, queryFn: getCustomers});
export const saveCustomerMutationOption = (client: QueryClient) => mutationOptions({
    mutationFn: ({id, values}: {id?: string; values: CustomerFormData}) => saveCustomer(values, id),
    onSuccess: async () => {
        await Promise.all([
            client.invalidateQueries({queryKey: customerKeys.all}),
            client.invalidateQueries({queryKey: orderKeys.customers}),
        ]);
    },
});
