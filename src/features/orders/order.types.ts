import type { Database } from "../../database.types";
export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type OrderOrigin = "online" | "staff";
export type OrderItem = {
  item_id: string;
  quantity: number;
  sale_price: number;
};
export type OrderRow = Database["public"]["Tables"]["order"]["Row"];

export const orderKeys = {
    all: ["orders"] as const,
    list: (userId: string, history: boolean, staff: boolean) => ["orders", "list", userId, history, staff] as const,
    details: (userId: string, id: string) => ["orders", "details", userId, id] as const,
    timeline: (userId: string, id: string, staff: boolean) => ["orders", "timeline", userId, id, staff] as const,
    items: ["orders", "items"] as const,
    customers: ["orders", "customers"] as const,
};
