import type { OrderStatus } from "./order.types";
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
