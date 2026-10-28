import type { CustomerFormData } from "./customer.types";
import { supabase } from "../../lib/supabase";
export async function getCustomers() {
  const { data, error } = await supabase
    .from("customer")
    .select("*")
    .order("first_name");
  if (error) throw error;
  return data;
}
export async function saveCustomer(
  values: CustomerFormData,
  id?: string,
) {
  const { data, error } = await supabase.rpc("save_customer", {
    p_customer_id: id,
    p_first_name: values.first_name,
    p_last_name: values.last_name,
    p_email: values.email,
    p_phone_number: values.phone_number,
    p_address: values.address,
    p_customer_notes: values.customer_notes,
    p_is_active: values.is_active,
  });
  if (error) throw error;
  return data;
}
