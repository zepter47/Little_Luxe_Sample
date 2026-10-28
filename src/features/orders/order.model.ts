import type { OrderStatus } from "./order.types";
export const orderActionLabel = (status: OrderStatus) =>
  status === "delivered" ? "Confirm delivery and cash received"
    : status === "processed" ? "Process order"
      : status === "shipped" ? "Ship order" : "Decline order";

export function allowedActions(
  origin: string,
  status: OrderStatus | null,
): OrderStatus[] {
  if (origin !== "online" && origin !== "staff") return [];
  if (origin === "staff")
    return status === "received" ? ["delivered", "declined"] : [];
  return status === "received"
    ? ["processed", "declined"]
    : status === "processed"
      ? ["shipped", "declined"]
      : status === "shipped"
        ? ["delivered", "declined"]
        : [];
}
