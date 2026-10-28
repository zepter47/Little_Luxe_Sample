import { mutationOptions, queryOptions, type QueryClient } from "@tanstack/react-query";
import { createStaffOrder, getOrderCustomersAsync, getOrderDetails, getOrderItemsAsync, getOrders, getTimeline, updateOrderStatus } from "./order.api";
import { orderKeys, type OrderItem, type OrderStatus } from "./order.types";
import { itemKeys } from "../items/item.types";

// Orders reserve/release stock. Refresh inventory explicitly, without depending on its UI.
export async function refreshOrders(client: QueryClient) {
    await Promise.all([
        client.invalidateQueries({queryKey: orderKeys.all}),
        client.invalidateQueries({queryKey: itemKeys.all}),
    ]);
}
export const getOrdersQueryOption = (userId: string, history: boolean, staff: boolean) => queryOptions({
    queryKey: orderKeys.list(userId, history, staff), queryFn: () => getOrders(!history),
    enabled: !!userId, refetchInterval: 30000,
});
export const getOrderDetailsQueryOption = (userId: string, id: string) => queryOptions({
    queryKey: orderKeys.details(userId, id), queryFn: () => getOrderDetails(id), enabled: !!userId && !!id,
});
export const getOrderTimelineQueryOption = (userId: string, id: string, staff: boolean) => queryOptions({
    queryKey: orderKeys.timeline(userId, id, staff), queryFn: () => getTimeline(id, staff), enabled: !!userId && !!id,
});
export const getOrderItemsQueryOption = () => queryOptions({queryKey: orderKeys.items, queryFn: getOrderItemsAsync});
export const getOrderCustomersQueryOption = () => queryOptions({queryKey: orderKeys.customers, queryFn: getOrderCustomersAsync});
export const updateOrderStatusMutationOption = (client: QueryClient) => mutationOptions({
    mutationFn: ({orderId, status, reason}: {orderId: string; status: OrderStatus; reason: string}) => updateOrderStatus(orderId, status, reason),
    onSuccess: () => refreshOrders(client),
});
export const createStaffOrderMutationOption = (client: QueryClient) => mutationOptions({
    mutationFn: ({customerId, items, requestId, notes}: {customerId: string; items: OrderItem[]; requestId: string; notes: string}) => createStaffOrder(customerId, items, requestId, notes),
    retry: false,
    onSuccess: () => refreshOrders(client),
});
