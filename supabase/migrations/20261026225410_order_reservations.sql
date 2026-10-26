-- CLI migration creation was attempted; CLI cannot create its read-only home config.
-- Applied to hosted Supabase; filename matches its recorded migration version.
BEGIN;
CREATE SCHEMA IF NOT EXISTS order_private;
REVOKE ALL ON SCHEMA order_private FROM PUBLIC, anon, authenticated;
-- Existing orders require an explicit reconciliation; never guess their origin or reserve twice.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public."order") THEN
  RAISE EXCEPTION 'Reconcile legacy orders before installing the reservation workflow.';
 END IF;
END $$;
DROP FUNCTION IF EXISTS public.cart_checkout(jsonb,uuid,boolean);
DROP FUNCTION IF EXISTS checkout_private.process_cart(jsonb,uuid,boolean);
DROP TABLE IF EXISTS checkout_private.requests;
DROP SCHEMA IF EXISTS checkout_private;

CREATE TABLE public.customer (
 customer_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 first_name text NOT NULL CHECK (btrim(first_name) <> ''),
 last_name text NOT NULL CHECK (btrim(last_name) <> ''),
 email text, phone_number text, address text, customer_notes text,
 is_active boolean NOT NULL DEFAULT true,
 added_by uuid NOT NULL, added_on timestamptz NOT NULL DEFAULT now(),
 updated_by uuid, updated_on timestamptz
);
ALTER TABLE public.customer ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.customer TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.customer FROM PUBLIC,anon,authenticated;
CREATE POLICY customer_staff_read ON public.customer FOR SELECT TO authenticated
 USING ((SELECT public.authorize('orders.create')) AND (SELECT auth.jwt()->>'user_role') IN ('staff','admin'));

ALTER TABLE public."order"
 ADD COLUMN customer_id uuid NOT NULL,
 ADD COLUMN order_origin text NOT NULL CHECK(order_origin IN ('online','staff')),
 ADD COLUMN expected_expiry_date timestamptz NOT NULL,
 ADD COLUMN request_id uuid NOT NULL,
 ADD CONSTRAINT order_request_unique UNIQUE(added_by,request_id),
 ADD CONSTRAINT online_order_identity CHECK(order_origin <> 'online' OR customer_id = added_by);
ALTER TABLE public."order" ALTER COLUMN order_status SET NOT NULL,
 ALTER COLUMN order_status SET DEFAULT 'received', ALTER COLUMN added_by SET NOT NULL,
 ALTER COLUMN added_on SET NOT NULL;
CREATE INDEX order_customer_idx ON public."order"(customer_id);
CREATE INDEX order_expiry_idx ON public."order"(expected_expiry_date) WHERE order_status='received';
UPDATE public.stock SET quantity_at_hand=0 WHERE quantity_at_hand IS NULL;
ALTER TABLE public.stock ADD COLUMN quantity_reserved integer NOT NULL DEFAULT 0,
 ALTER COLUMN quantity_at_hand SET NOT NULL,
 ADD CONSTRAINT stock_reservation_bounds CHECK(quantity_reserved>=0 AND quantity_at_hand>=quantity_reserved);
ALTER TABLE public.order_details ALTER COLUMN order_id SET NOT NULL,
 ALTER COLUMN item_id SET NOT NULL, ALTER COLUMN quantity_sold SET NOT NULL,
 ALTER COLUMN sale_price SET NOT NULL,
 ADD CONSTRAINT order_positive_quantity CHECK(quantity_sold>0),
 ADD CONSTRAINT order_valid_price CHECK(sale_price>=0 AND sale_price::text NOT IN ('NaN','Infinity','-Infinity'));
CREATE TABLE public.stock_reservation (
 reservation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 order_details_id uuid NOT NULL REFERENCES public.order_details(order_details_id),
 stock_id uuid NOT NULL REFERENCES public.stock(stock_id),
 quantity_reserved integer NOT NULL CHECK(quantity_reserved>0),
 reservation_status text NOT NULL DEFAULT 'active' CHECK(reservation_status IN ('active','fulfilled','released')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(order_details_id,stock_id)
);
CREATE INDEX reservation_active_stock_idx ON public.stock_reservation(stock_id) WHERE reservation_status='active';
CREATE INDEX order_details_order_idx ON public.order_details(order_id);
CREATE INDEX order_details_item_idx ON public.order_details(item_id);
CREATE TABLE public.order_status_history (
 history_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 order_id uuid NOT NULL REFERENCES public."order"(order_id),
 previous_status public.order_status,
 new_status public.order_status NOT NULL,
 changed_by uuid,
 actor_type text NOT NULL CHECK(actor_type IN ('customer','staff','system')),
 change_source text NOT NULL CHECK(change_source IN ('online_checkout','staff_order','staff_action','cron','on_demand_expiry')),
 reason_code text NOT NULL,
 reason_notes text,
 changed_on timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX order_history_timeline_idx ON public.order_status_history(order_id,changed_on,history_id);
ALTER TABLE public.stock_reservation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.stock_reservation,public.order_status_history FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.order_status_history TO authenticated;
CREATE POLICY history_staff_read ON public.order_status_history FOR SELECT TO authenticated
 USING ((SELECT public.authorize('orders.read')) AND (SELECT auth.jwt()->>'user_role') IN ('staff','admin'));
-- Customer timeline is returned by a projection RPC so employee IDs/internal notes stay private.
REVOKE INSERT,UPDATE,DELETE ON public."order",public.order_details FROM PUBLIC,anon,authenticated;
-- Remove any column grants too (table revocation does not revoke them).
DO $$ DECLARE t text; c record; BEGIN
 FOREACH t IN ARRAY ARRAY['order','order_details'] LOOP
  FOR c IN SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=t LOOP
   EXECUTE format('REVOKE INSERT (%I),UPDATE (%I) ON public.%I FROM PUBLIC,anon,authenticated',c.column_name,c.column_name,t);
  END LOOP;
 END LOOP;
END $$;
CREATE TABLE order_private.requests (
 actor_id uuid NOT NULL, request_id uuid NOT NULL, payload jsonb NOT NULL,
 order_id uuid NOT NULL REFERENCES public."order"(order_id), PRIMARY KEY(actor_id,request_id)
);
ALTER TABLE order_private.requests ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION order_private.staff_allowed(p_permission public.app_permission)
RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND NOT coalesce((auth.jwt()->>'is_anonymous')::boolean,false)
 AND coalesce(auth.jwt()->>'user_role','') IN ('staff','admin') AND coalesce(public.authorize(p_permission),false)
$$;

CREATE FUNCTION public.save_customer(p_first_name text,p_last_name text,p_email text DEFAULT NULL,
 p_phone_number text DEFAULT NULL,p_address text DEFAULT NULL,p_customer_notes text DEFAULT NULL,
 p_customer_id uuid DEFAULT NULL,p_is_active boolean DEFAULT true)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid;
BEGIN
 IF NOT order_private.staff_allowed('orders.create') THEN RAISE EXCEPTION 'Staff permission required.' USING ERRCODE='42501'; END IF;
 IF nullif(btrim(p_first_name),'') IS NULL OR nullif(btrim(p_last_name),'') IS NULL THEN RAISE EXCEPTION 'Customer first and last names are required.'; END IF;
 IF p_customer_id IS NULL THEN
  INSERT INTO public.customer(first_name,last_name,email,phone_number,address,customer_notes,added_by)
  VALUES(btrim(p_first_name),btrim(p_last_name),nullif(btrim(p_email),''),nullif(btrim(p_phone_number),''),nullif(btrim(p_address),''),p_customer_notes,auth.uid()) RETURNING customer_id INTO v_id;
 ELSE
  UPDATE public.customer SET first_name=btrim(p_first_name),last_name=btrim(p_last_name),email=nullif(btrim(p_email),''),phone_number=nullif(btrim(p_phone_number),''),address=nullif(btrim(p_address),''),customer_notes=p_customer_notes,is_active=coalesce(p_is_active,true),updated_by=auth.uid(),updated_on=clock_timestamp()
  WHERE customer_id=p_customer_id RETURNING customer_id INTO v_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Customer not found.'; END IF;
 END IF;
 RETURN v_id;
END $$;

-- All order lifecycle transactions take this lock FIRST. At Little Luxe's scale,
-- serialization is deliberate: cleanup across multi-item orders cannot invert stock locks.
CREATE FUNCTION order_private.lock_inventory() RETURNS void LANGUAGE sql SET search_path='' AS $$
 SELECT pg_catalog.pg_advisory_xact_lock(726441,1)
$$;

CREATE FUNCTION order_private.finish_reservations(p_order_id uuid,p_delivered boolean)
RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE r record; v_count integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.order_details WHERE order_id=p_order_id) OR EXISTS (
 SELECT 1 FROM public.order_details d LEFT JOIN public.stock_reservation s ON s.order_details_id=d.order_details_id AND s.reservation_status='active'
 WHERE d.order_id=p_order_id GROUP BY d.order_details_id,d.quantity_sold
 HAVING coalesce(sum(s.quantity_reserved),0)<>d.quantity_sold) THEN RAISE EXCEPTION 'Order reservations are inconsistent.'; END IF;
 FOR r IN SELECT s.* FROM public.stock_reservation s JOIN public.order_details d USING(order_details_id)
 WHERE d.order_id=p_order_id AND s.reservation_status='active' ORDER BY s.stock_id,s.reservation_id LOOP
  UPDATE public.stock SET quantity_reserved=quantity_reserved-r.quantity_reserved,
   quantity_at_hand=quantity_at_hand-CASE WHEN p_delivered THEN r.quantity_reserved ELSE 0 END
  WHERE stock_id=r.stock_id AND quantity_reserved>=r.quantity_reserved AND quantity_at_hand>=r.quantity_reserved;
  GET DIAGNOSTICS v_count=ROW_COUNT;
  IF v_count<>1 THEN RAISE EXCEPTION 'Reservation stock is inconsistent.'; END IF;
  UPDATE public.stock_reservation SET reservation_status=CASE WHEN p_delivered THEN 'fulfilled' ELSE 'released' END WHERE reservation_id=r.reservation_id;
 END LOOP;
END $$;

CREATE FUNCTION order_private.expire_order_if_due(p_order_id uuid,p_source text DEFAULT 'on_demand_expiry')
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public."order";
BEGIN
 PERFORM order_private.lock_inventory();
 SELECT * INTO o FROM public."order" WHERE order_id=p_order_id FOR UPDATE;
 IF NOT FOUND OR o.order_status<>'received' OR o.expected_expiry_date>clock_timestamp() THEN RETURN false; END IF;
 PERFORM order_private.finish_reservations(p_order_id,false);
 UPDATE public."order" SET order_status='declined',updated_by=NULL,updated_on=clock_timestamp() WHERE order_id=p_order_id;
 INSERT INTO public.order_status_history(order_id,previous_status,new_status,actor_type,change_source,reason_code)
 VALUES(p_order_id,'received','declined','system',p_source,'expired');
 RETURN true;
END $$;
CREATE FUNCTION order_private.expire_received_orders(p_item_ids uuid[] DEFAULT NULL,p_limit integer DEFAULT 100,p_source text DEFAULT 'cron')
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r record; n integer:=0;
BEGIN
 PERFORM order_private.lock_inventory();
 FOR r IN SELECT o.order_id FROM public."order" o WHERE o.order_status='received' AND o.expected_expiry_date<=clock_timestamp()
 AND (p_item_ids IS NULL OR EXISTS(SELECT 1 FROM public.order_details d WHERE d.order_id=o.order_id AND d.item_id=ANY(p_item_ids)))
 ORDER BY o.expected_expiry_date,o.order_id LIMIT least(greatest(coalesce(p_limit,100),1),100) FOR UPDATE LOOP
  IF order_private.expire_order_if_due(r.order_id,p_source) THEN n:=n+1; END IF;
 END LOOP;
 RETURN n;
END $$;

-- Shared inventory mechanics only. Public entry points own authentication/customer rules.
CREATE FUNCTION order_private.reserve_order(p_customer_id uuid,p_origin text,p_items jsonb,p_request_id uuid,p_notes text)
RETURNS uuid LANGUAGE plpgsql SET search_path='' AS $$
DECLARE v_id uuid:=gen_random_uuid(); v_old order_private.requests; v_payload jsonb;
 l record; i record; s record; v_detail uuid; v_left integer; v_take integer; v_ids uuid[]; v_issues jsonb:='[]';
BEGIN
 IF p_request_id IS NULL OR p_items IS NULL OR jsonb_typeof(p_items)<>'array' THEN RAISE EXCEPTION 'Invalid order request.'; END IF;
 IF jsonb_array_length(p_items) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'An order must contain 1–100 items.'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_items) e WHERE jsonb_typeof(e)<>'object' OR coalesce(e->>'item_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 OR coalesce(jsonb_typeof(e->'quantity'),'')<>'number' OR coalesce(e->>'quantity','') !~ '^[1-9][0-9]{0,2}$' OR coalesce(jsonb_typeof(e->'sale_price'),'')<>'number') THEN RAISE EXCEPTION 'Invalid items, prices or quantities (1–999).'; END IF;
 IF (SELECT count(DISTINCT (e->>'item_id')::uuid) FROM jsonb_array_elements(p_items) e)<>jsonb_array_length(p_items) THEN RAISE EXCEPTION 'Duplicate items are not allowed.'; END IF;
 SELECT array_agg(x.item_id ORDER BY x.item_id) INTO v_ids FROM jsonb_to_recordset(p_items) x(item_id uuid);
 v_payload:=jsonb_build_object('origin',p_origin,'customer',p_customer_id,'items',p_items,'notes',p_notes);
 PERFORM order_private.lock_inventory();
 SELECT * INTO v_old FROM order_private.requests WHERE actor_id=auth.uid() AND request_id=p_request_id;
 IF FOUND THEN
  IF v_old.payload<>v_payload THEN RAISE EXCEPTION 'Request ID already used for a different order.'; END IF;
  RETURN v_old.order_id;
 END IF;
 -- Drain all relevant expiry batches before the availability decision.
 WHILE order_private.expire_received_orders(v_ids,100,'on_demand_expiry')=100 LOOP END LOOP;
 PERFORM item_id FROM public.item WHERE item_id=ANY(v_ids) ORDER BY item_id FOR UPDATE;
 PERFORM stock_id FROM public.stock WHERE item_id=ANY(v_ids) ORDER BY stock_id FOR UPDATE;
 FOR l IN SELECT * FROM jsonb_to_recordset(p_items) x(item_id uuid,quantity integer,sale_price numeric) ORDER BY item_id LOOP
  SELECT item_name,sale_price,is_active INTO i FROM public.item WHERE item_id=l.item_id;
  IF NOT FOUND OR i.is_active IS NOT TRUE OR i.sale_price IS NULL OR i.sale_price<0 OR i.sale_price::text IN ('NaN','Infinity','-Infinity') THEN
   v_issues:=v_issues||jsonb_build_array(jsonb_build_object('item_id',l.item_id,'code','ITEM_UNAVAILABLE'));
  ELSE
   IF i.sale_price<>l.sale_price THEN v_issues:=v_issues||jsonb_build_array(jsonb_build_object('item_id',l.item_id,'code','PRICE_CHANGED','previous_price',l.sale_price,'current_price',i.sale_price)); END IF;
   SELECT coalesce(sum(quantity_at_hand-quantity_reserved),0) AS available INTO s FROM public.stock WHERE item_id=l.item_id AND (expiry_date IS NULL OR expiry_date>=current_date);
   IF s.available<l.quantity THEN v_issues:=v_issues||jsonb_build_array(jsonb_build_object('item_id',l.item_id,'code','INSUFFICIENT_STOCK','requested',l.quantity,'available',s.available)); END IF;
  END IF;
 END LOOP;
 IF jsonb_array_length(v_issues)>0 THEN RAISE EXCEPTION 'Your order needs attention.' USING DETAIL=v_issues::text,ERRCODE='P0001'; END IF;
 INSERT INTO public."order"(order_id,added_by,added_on,customer_id,order_origin,expected_expiry_date,request_id,order_status,is_active,order_notes)
 VALUES(v_id,auth.uid(),clock_timestamp(),p_customer_id,p_origin,clock_timestamp()+interval '12 hours',p_request_id,'received',true,p_notes);
 FOR l IN SELECT * FROM jsonb_to_recordset(p_items) x(item_id uuid,quantity integer,sale_price numeric) ORDER BY item_id LOOP
  INSERT INTO public.order_details(order_id,item_id,sale_price,quantity_sold) SELECT v_id,item_id,sale_price,l.quantity FROM public.item WHERE item_id=l.item_id RETURNING order_details_id INTO v_detail;
  v_left:=l.quantity;
  FOR s IN SELECT * FROM public.stock WHERE item_id=l.item_id AND quantity_at_hand>quantity_reserved AND (expiry_date IS NULL OR expiry_date>=current_date) ORDER BY expiry_date NULLS LAST,stock_id LOOP
   v_take:=least(v_left,s.quantity_at_hand-s.quantity_reserved);
   UPDATE public.stock SET quantity_reserved=quantity_reserved+v_take WHERE stock_id=s.stock_id;
   INSERT INTO public.stock_reservation(order_details_id,stock_id,quantity_reserved) VALUES(v_detail,s.stock_id,v_take);
   v_left:=v_left-v_take; EXIT WHEN v_left=0;
  END LOOP;
  IF v_left<>0 THEN RAISE EXCEPTION 'Stock allocation failed.'; END IF;
 END LOOP;
 INSERT INTO public.order_status_history(order_id,new_status,changed_by,actor_type,change_source,reason_code)
 VALUES(v_id,'received',auth.uid(),CASE WHEN p_origin='online' THEN 'customer' ELSE 'staff' END,CASE WHEN p_origin='online' THEN 'online_checkout' ELSE 'staff_order' END,'order_created');
 INSERT INTO order_private.requests VALUES(auth.uid(),p_request_id,v_payload,v_id);
 RETURN v_id;
END $$;
CREATE FUNCTION public.create_online_order(p_items_json jsonb,p_request_id uuid,p_order_notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) THEN RAISE EXCEPTION 'Authentication required.' USING ERRCODE='28000'; END IF;
 RETURN order_private.reserve_order(auth.uid(),'online',p_items_json,p_request_id,p_order_notes);
END $$;
CREATE FUNCTION public.create_staff_order(p_customer_id uuid,p_items_json jsonb,p_request_id uuid,p_order_notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT order_private.staff_allowed('orders.create') THEN RAISE EXCEPTION 'Staff permission required.' USING ERRCODE='42501'; END IF;
 PERFORM order_private.lock_inventory();
 PERFORM customer_id FROM public.customer WHERE customer_id=p_customer_id AND is_active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Select an existing active customer.'; END IF;
 RETURN order_private.reserve_order(p_customer_id,'staff',p_items_json,p_request_id,p_order_notes);
END $$;
CREATE FUNCTION public.update_order_status(p_order_id uuid,p_new_status public.order_status,p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public."order"; v_reason text;
BEGIN
 IF NOT order_private.staff_allowed('orders.update') THEN RAISE EXCEPTION 'Staff permission required.' USING ERRCODE='42501'; END IF;
 PERFORM order_private.lock_inventory();
 SELECT * INTO o FROM public."order" WHERE order_id=p_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Order not found.'; END IF;
 IF order_private.expire_order_if_due(p_order_id) THEN RETURN jsonb_build_object('outcome','expired','order_status','declined'); END IF;
 IF o.order_status=p_new_status THEN RETURN jsonb_build_object('outcome','unchanged','order_status',o.order_status); END IF;
 IF p_new_status IS NULL OR NOT ((o.order_origin='staff' AND o.order_status='received' AND p_new_status IN ('delivered','declined')) OR
 (o.order_origin='online' AND ((o.order_status='received' AND p_new_status IN ('processed','declined')) OR
 (o.order_status='processed' AND p_new_status IN ('shipped','declined')) OR (o.order_status='shipped' AND p_new_status IN ('delivered','declined'))))) THEN RAISE EXCEPTION 'Invalid order status transition.'; END IF;
 IF p_new_status='declined' AND nullif(btrim(p_reason),'') IS NULL THEN RAISE EXCEPTION 'Enter a reason for declining the order.'; END IF;
 IF p_new_status IN ('delivered','declined') THEN PERFORM order_private.finish_reservations(p_order_id,p_new_status='delivered'); END IF;
 UPDATE public."order" SET order_status=p_new_status,updated_by=auth.uid(),updated_on=clock_timestamp() WHERE order_id=p_order_id;
 v_reason:=CASE p_new_status WHEN 'processed' THEN 'processing_started' WHEN 'shipped' THEN 'dispatched' WHEN 'delivered' THEN 'cash_received' ELSE 'manual_decline' END;
 INSERT INTO public.order_status_history(order_id,previous_status,new_status,changed_by,actor_type,change_source,reason_code,reason_notes)
 VALUES(p_order_id,o.order_status,p_new_status,auth.uid(),'staff','staff_action',v_reason,p_reason);
 RETURN jsonb_build_object('outcome','updated','order_status',p_new_status);
END $$;
-- Read-only customer projection excludes internal staff IDs and notes.
CREATE FUNCTION public.get_order_timeline(p_order_id uuid)
RETURNS TABLE(history_id bigint,previous_status public.order_status,new_status public.order_status,changed_on timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public."order" o WHERE o.order_id=p_order_id AND
 ((o.order_origin='online' AND o.customer_id=auth.uid()) OR order_private.staff_allowed('orders.read'))) THEN RAISE EXCEPTION 'Order access denied.' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT h.history_id,h.previous_status,h.new_status,h.changed_on FROM public.order_status_history h WHERE h.order_id=p_order_id ORDER BY h.changed_on,h.history_id;
END $$;
-- Protect the reserved counter without breaking SECURITY INVOKER purchases.
CREATE FUNCTION order_private.guard_reserved_counter() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF current_user IN ('authenticated','anon') AND ((TG_OP='INSERT' AND NEW.quantity_reserved<>0) OR (TG_OP='UPDATE' AND NEW.quantity_reserved IS DISTINCT FROM OLD.quantity_reserved)) THEN RAISE EXCEPTION 'Reservations must use order functions.' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER stock_reserved_guard BEFORE INSERT OR UPDATE ON public.stock FOR EACH ROW EXECUTE FUNCTION order_private.guard_reserved_counter();
-- Customers read their own ONLINE orders; staff ownership never grants customer access.
GRANT SELECT ON public."order",public.order_details TO authenticated;
DROP POLICY IF EXISTS "admin and staff can view order" ON public."order";
CREATE POLICY "admin and staff can view order" ON public."order" FOR SELECT TO authenticated
 USING ((SELECT auth.jwt()->>'user_role') IN ('staff','admin') AND (SELECT public.authorize('orders.read')));
DROP POLICY IF EXISTS "admin and staff can view order details" ON public.order_details;
CREATE POLICY "admin and staff can view order details" ON public.order_details FOR SELECT TO authenticated
 USING ((SELECT auth.jwt()->>'user_role') IN ('staff','admin') AND (SELECT public.authorize('orders.read')));
DROP POLICY IF EXISTS "customer can only view their own orders" ON public."order";
CREATE POLICY online_customer_order_read ON public."order" FOR SELECT TO authenticated USING(order_origin='online' AND customer_id=(SELECT auth.uid()));
DROP POLICY IF EXISTS "customer can only view their own order details" ON public.order_details;
CREATE POLICY online_customer_details_read ON public.order_details FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public."order" o WHERE o.order_id=order_details.order_id AND o.order_origin='online' AND o.customer_id=(SELECT auth.uid())));
-- Definer entry points have explicit auth/permission checks; helpers are never client-callable.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA order_private FROM PUBLIC,anon,authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA order_private FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.create_online_order(jsonb,uuid,text),public.create_staff_order(uuid,jsonb,uuid,text),public.update_order_status(uuid,public.order_status,text),public.get_order_timeline(uuid),public.save_customer(text,text,text,text,text,text,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_online_order(jsonb,uuid,text),public.create_staff_order(uuid,jsonb,uuid,text),public.update_order_status(uuid,public.order_status,text),public.get_order_timeline(uuid),public.save_customer(text,text,text,text,text,text,uuid,boolean) TO authenticated;
-- Storefront availability must count reservations.
CREATE OR REPLACE FUNCTION private.item_has_available_stock(p_item_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.item i WHERE i.item_id=p_item_id AND (i.is_active OR public.authorize('products.update'))
 AND (SELECT coalesce(sum(s.quantity_at_hand-s.quantity_reserved),0)>0 FROM public.stock s WHERE s.item_id=i.item_id AND (s.expiry_date IS NULL OR s.expiry_date>=current_date)))
$$;
-- Keep physical quantity visible to staff, while availability accounts for reservations.
CREATE OR REPLACE FUNCTION public.get_admin_items_with_stock(p_include_inactive boolean DEFAULT false)
RETURNS TABLE(item_id uuid,item_name varchar,sale_price numeric,item_category_id uuid,uom_id uuid,image_path varchar,product_notes varchar,is_active boolean,is_stocked boolean,quantity_on_hand bigint)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.authorize('stock.read'),false) OR NOT coalesce(public.authorize('products.read'),false) THEN RAISE EXCEPTION 'You do not have permission to view item inventory' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT i.item_id,i.item_name,i.sale_price,i.item_category_id,i.uom_id,i.image_path,i.product_notes,i.is_active,
 coalesce(s.available,0)>0,coalesce(s.quantity,0)
 FROM public.item i LEFT JOIN (SELECT st.item_id,sum(st.quantity_at_hand)::bigint quantity,
 sum(CASE WHEN st.expiry_date IS NULL OR st.expiry_date>=current_date THEN st.quantity_at_hand-st.quantity_reserved ELSE 0 END)::bigint available FROM public.stock st GROUP BY st.item_id) s ON s.item_id=i.item_id
 WHERE i.is_active OR coalesce(p_include_inactive,false) ORDER BY i.item_name,i.item_id;
END $$;

COMMIT;
