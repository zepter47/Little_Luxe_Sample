import type { OrderPerson, OrderStatus } from "./order.types";
export function orderPersonName(person: Pick<OrderPerson, "first_name" | "last_name" | "email"> | undefined, fallback = "Name unavailable") {
  const name = [person?.first_name?.trim(), person?.last_name?.trim()].filter(Boolean).join(" ");
  return name || person?.email?.trim() || fallback;
}

export function orderPersonLabel(id: string | null | undefined, people: OrderPerson[], fallback = "Name unavailable") {
  return orderPersonName(people.find(person => person.customer_id === id), fallback);
}

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
