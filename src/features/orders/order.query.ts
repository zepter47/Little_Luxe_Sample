import type { QueryClient } from "@tanstack/react-query";
export async function refreshOrders(client: QueryClient) {
  await Promise.all(
    [
      "orders",
      "stock",
      "stock-options",
      "items",
      "item",
      "admin-items",
      "order-timeline",
      "order-details",
    ].map((key) => client.invalidateQueries({ queryKey: [key] })),
  );
}
