import { supabase } from "../../lib/supabase";
import { orderItemsSchema } from "./order.schema";
import type { Database } from "../../database.types";
export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type OrderOrigin = "online" | "staff";
export type OrderItem = {
  item_id: string;
  quantity: number;
  sale_price: number;
};
export type OrderRow = Database["public"]["Tables"]["order"]["Row"];
export class OrderValidationError extends Error {
  issues: {
    item_id: string;
    code: string;
    requested?: number;
    available?: number;
    previous_price?: number;
    current_price?: number;
  }[] = [];
  constructor(error: { message: string; details?: string }) {
    super(error.message);
    try {
      const issues: unknown = JSON.parse(error.details || "[]");
      if (Array.isArray(issues)) this.issues = issues;
    } catch {
      /* Unexpected server errors keep their message. */
    }
  }
}
export async function createOnlineOrder(items: OrderItem[], requestId: string) {
  const { data, error } = await supabase.rpc("create_online_order", {
    p_items_json: orderItemsSchema.parse(items),
    p_request_id: requestId,
  });
  if (error) throw new OrderValidationError(error);
  return data;
}
export async function createStaffOrder(
  customerId: string,
  items: OrderItem[],
  requestId: string,
  notes: string,
) {
  const { data, error } = await supabase.rpc("create_staff_order", {
    p_customer_id: customerId,
    p_items_json: orderItemsSchema.parse(items),
    p_request_id: requestId,
    p_order_notes: notes,
  });
  if (error) throw new OrderValidationError(error);
  return data;
}
export async function getOrders(active = true) {
  let query = supabase
    .from("order")
    .select("*")
    .order("added_on", { ascending: false });
  query = active
    ? query.in("order_status", ["received", "processed", "shipped"])
    : query.in("order_status", ["delivered", "declined"]);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
export async function getOrderDetails(orderId: string) {
  const { data, error } = await supabase
    .from("order_details")
    .select("*,item:item(item_name)")
    .eq("order_id", orderId);
  if (error) throw error;
  return data;
}
export async function getTimeline(orderId: string, staff: boolean) {
  if (staff) {
    const { data, error } = await supabase
      .from("order_status_history")
      .select("*")
      .eq("order_id", orderId)
      .order("history_id");
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.rpc("get_order_timeline", {
    p_order_id: orderId,
  });
  if (error) throw error;
  return data;
}
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  reason: string,
) {
  const { data, error } = await supabase.rpc("update_order_status", {
    p_order_id: orderId,
    p_new_status: status,
    p_reason: reason,
  });
  if (error) throw error;
  return data as {
    outcome: "updated" | "expired" | "unchanged";
    order_status: OrderStatus;
  };
}
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
