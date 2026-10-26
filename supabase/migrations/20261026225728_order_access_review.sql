BEGIN;
-- A single SELECT policy per table, with JWT lookups cached as initplans.
DROP POLICY customer_staff_read ON public.customer;
DROP POLICY customer_account_read ON public.customer;
CREATE POLICY customer_read ON public.customer FOR SELECT TO authenticated USING (
 (customer_origin='account' AND customer_id=(SELECT auth.uid())) OR
 (((SELECT auth.jwt())->>'user_role') IN ('staff','admin') AND (SELECT public.authorize('orders.create')))
);
DROP POLICY "admin and staff can view order" ON public."order";
DROP POLICY online_customer_order_read ON public."order";
CREATE POLICY order_read ON public."order" FOR SELECT TO authenticated USING (
 (order_origin='online' AND customer_id=(SELECT auth.uid())) OR
 (((SELECT auth.jwt())->>'user_role') IN ('staff','admin') AND (SELECT public.authorize('orders.read')))
);
DROP POLICY "admin and staff can view order details" ON public.order_details;
DROP POLICY online_customer_details_read ON public.order_details;
CREATE POLICY order_details_read ON public.order_details FOR SELECT TO authenticated USING (
 (((SELECT auth.jwt())->>'user_role') IN ('staff','admin') AND (SELECT public.authorize('orders.read'))) OR
 EXISTS(SELECT 1 FROM public."order" o WHERE o.order_id=order_details.order_id AND o.order_origin='online' AND o.customer_id=(SELECT auth.uid()))
);
ALTER POLICY history_staff_read ON public.order_status_history USING (
 ((SELECT auth.jwt())->>'user_role') IN ('staff','admin') AND (SELECT public.authorize('orders.read'))
);
-- Direct client writes were revoked by the order migration; retire old write policies too.
DROP POLICY IF EXISTS "customers staff and admin can add order" ON public."order";
DROP POLICY IF EXISTS "admin and staff can update order" ON public."order";
DROP POLICY IF EXISTS "admin and staff can delete order" ON public."order";
DROP POLICY IF EXISTS "customers staff and admin can add order details" ON public.order_details;
DROP POLICY IF EXISTS "admin and staff can update order details" ON public.order_details;
DROP POLICY IF EXISTS "admin and staff can delete order details" ON public.order_details;
CREATE POLICY reservation_no_client_access ON public.stock_reservation FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);
CREATE POLICY request_no_client_access ON order_private.requests FOR ALL TO anon,authenticated USING(false) WITH CHECK(false);
-- Preserve pre-existing covering indexes; remove only the duplicates added by this workflow.
DO $$ BEGIN
 IF to_regclass('public.idx_sale_details_item_id') IS NOT NULL THEN DROP INDEX public.order_details_item_idx; END IF;
 IF to_regclass('public.idx_sale_details_sale_id') IS NOT NULL THEN DROP INDEX public.order_details_order_idx; END IF;
END $$;
-- Privilege elevation lives in the non-exposed schema. Only the authenticated
-- entry functions below receive EXECUTE; stock/expiry helpers remain inaccessible.
ALTER FUNCTION public.create_online_order(jsonb,uuid,text) SET SCHEMA order_private;
ALTER FUNCTION public.create_staff_order(uuid,jsonb,uuid,text) SET SCHEMA order_private;
ALTER FUNCTION public.update_order_status(uuid,public.order_status,text) SET SCHEMA order_private;
ALTER FUNCTION public.get_order_timeline(uuid) SET SCHEMA order_private;
ALTER FUNCTION public.save_customer(text,text,text,text,text,text,uuid,boolean) SET SCHEMA order_private;
GRANT USAGE ON SCHEMA order_private TO authenticated;
CREATE FUNCTION public.create_online_order(p_items_json jsonb,p_request_id uuid,p_order_notes text DEFAULT NULL)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT order_private.create_online_order(p_items_json,p_request_id,p_order_notes)
$$;
CREATE FUNCTION public.create_staff_order(p_customer_id uuid,p_items_json jsonb,p_request_id uuid,p_order_notes text DEFAULT NULL)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT order_private.create_staff_order(p_customer_id,p_items_json,p_request_id,p_order_notes)
$$;
CREATE FUNCTION public.update_order_status(p_order_id uuid,p_new_status public.order_status,p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT order_private.update_order_status(p_order_id,p_new_status,p_reason)
$$;
CREATE FUNCTION public.get_order_timeline(p_order_id uuid)
RETURNS TABLE(history_id bigint,previous_status public.order_status,new_status public.order_status,changed_on timestamptz)
LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT * FROM order_private.get_order_timeline(p_order_id)
$$;
CREATE FUNCTION public.save_customer(p_first_name text,p_last_name text,p_email text DEFAULT NULL,
 p_phone_number text DEFAULT NULL,p_address text DEFAULT NULL,p_customer_notes text DEFAULT NULL,
 p_customer_id uuid DEFAULT NULL,p_is_active boolean DEFAULT true)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT order_private.save_customer(p_first_name,p_last_name,p_email,p_phone_number,p_address,p_customer_notes,p_customer_id,p_is_active)
$$;
REVOKE ALL ON FUNCTION public.create_online_order(jsonb,uuid,text),public.create_staff_order(uuid,jsonb,uuid,text),public.update_order_status(uuid,public.order_status,text),public.get_order_timeline(uuid),public.save_customer(text,text,text,text,text,text,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_online_order(jsonb,uuid,text),public.create_staff_order(uuid,jsonb,uuid,text),public.update_order_status(uuid,public.order_status,text),public.get_order_timeline(uuid),public.save_customer(text,text,text,text,text,text,uuid,boolean) TO authenticated;
REVOKE ALL ON FUNCTION order_private.create_online_order(jsonb,uuid,text),order_private.create_staff_order(uuid,jsonb,uuid,text),order_private.update_order_status(uuid,public.order_status,text),order_private.get_order_timeline(uuid),order_private.save_customer(text,text,text,text,text,text,uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION order_private.create_online_order(jsonb,uuid,text),order_private.create_staff_order(uuid,jsonb,uuid,text),order_private.update_order_status(uuid,public.order_status,text),order_private.get_order_timeline(uuid),order_private.save_customer(text,text,text,text,text,text,uuid,boolean) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
