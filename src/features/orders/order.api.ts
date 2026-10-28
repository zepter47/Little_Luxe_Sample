import { supabase } from "../../lib/supabase";
import { orderItemsSchema } from "./order.schema";
import type { OrderItem, OrderStatus } from "./order.types";
import { OrderValidationError } from "./order.errors";
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

export async function getOrderItemsAsync() {
    const {data, error} = await supabase.from("item").select("item_id,item_name,sale_price").order("item_name");
    if (error) throw error;
    return data;
}
export async function getOrderCustomersAsync() {
    const {data, error} = await supabase.from("customer").select("*").order("first_name");
    if (error) throw error;
    return data;
}
