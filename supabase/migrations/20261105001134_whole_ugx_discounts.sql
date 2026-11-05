-- Whole-percentage discounts, whole-shilling UGX prices, server-owned pricing.
-- Historical lines retain their recorded charged price. Unknown original prices
-- remain NULL; all new lines must carry a complete pricing snapshot.
ALTER TABLE public.item ADD COLUMN item_discount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.item ADD CONSTRAINT item_discount_whole_percent CHECK
  (item_discount BETWEEN 0 AND 100 AND item_discount = trunc(item_discount));
ALTER TABLE public.item ADD CONSTRAINT item_price_whole_ugx CHECK
  (sale_price >= 0 AND sale_price::text NOT IN ('NaN','Infinity','-Infinity') AND sale_price = trunc(sale_price));
ALTER TABLE public.order_details
  ADD COLUMN original_sale_price numeric,
  ADD COLUMN order_discount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.order_details ADD CONSTRAINT order_discount_whole_percent CHECK
  (order_discount BETWEEN 0 AND 100 AND order_discount = trunc(order_discount));
ALTER TABLE public.order_details ADD CONSTRAINT order_price_whole_ugx CHECK
  (sale_price >= 0 AND sale_price::text NOT IN ('NaN','Infinity','-Infinity') AND sale_price = trunc(sale_price));
ALTER TABLE public.order_details ADD CONSTRAINT order_price_snapshot_consistent CHECK
  (original_sale_price IS NULL OR (original_sale_price >= 0
    AND original_sale_price::text NOT IN ('NaN','Infinity','-Infinity')
    AND original_sale_price = trunc(original_sale_price)
    AND sale_price <= original_sale_price
    AND sale_price = round(original_sale_price * (100 - order_discount) / 100)));
COMMENT ON COLUMN public.order_details.original_sale_price IS
  'Original unit price at checkout; NULL for legacy orders whose original price was not recorded.';

CREATE FUNCTION order_private.guard_order_pricing() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.original_sale_price IS NULL THEN
    RAISE EXCEPTION 'Original price snapshot is required.' USING ERRCODE='23514';
  END IF;
  IF TG_OP = 'UPDATE' AND (NEW.original_sale_price,NEW.order_discount,NEW.sale_price,NEW.item_id)
    IS DISTINCT FROM (OLD.original_sale_price,OLD.order_discount,OLD.sale_price,OLD.item_id) THEN
    RAISE EXCEPTION 'Order pricing snapshots are immutable.' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION order_private.guard_order_pricing() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_order_pricing BEFORE INSERT OR UPDATE ON public.order_details
  FOR EACH ROW EXECUTE FUNCTION order_private.guard_order_pricing();

DROP FUNCTION IF EXISTS public.save_item(text,numeric,uuid,uuid,text,text,uuid,boolean);
CREATE OR REPLACE FUNCTION public.save_item(p_item_name text, p_sale_price numeric, p_category_id uuid, p_uom_id uuid, p_product_notes text, p_image_path text DEFAULT NULL::text, p_item_id uuid DEFAULT NULL::uuid, p_is_active boolean DEFAULT NULL::boolean, p_item_discount numeric DEFAULT NULL::numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE v_item_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE(public.authorize(
    CASE WHEN p_item_id IS NULL THEN 'products.create'::public.app_permission ELSE 'products.update'::public.app_permission END),false) THEN
    RAISE EXCEPTION 'You do not have permission to save this item' USING ERRCODE='42501';
  END IF;
  IF NULLIF(btrim(p_item_name),'') IS NULL THEN RAISE EXCEPTION 'Item name is required' USING ERRCODE='22023'; END IF;
  IF p_sale_price IS NULL OR p_sale_price < 0 OR p_sale_price::text IN ('NaN','Infinity','-Infinity') OR p_sale_price <> trunc(p_sale_price) THEN RAISE EXCEPTION 'Invalid sale price' USING ERRCODE='22023'; END IF;
  IF p_item_discount IS NOT NULL AND (p_item_discount::text IN ('NaN','Infinity','-Infinity')
    OR p_item_discount NOT BETWEEN 0 AND 100 OR p_item_discount <> trunc(p_item_discount)) THEN
    RAISE EXCEPTION 'Discount must be a whole percentage from 0 to 100.' USING ERRCODE='22023';
  END IF;
  IF p_item_id IS NULL THEN
    INSERT INTO public.item(item_name,sale_price,item_discount,item_category_id,uom_id,product_notes,image_path,is_active,is_stocked,added_by)
    VALUES (btrim(p_item_name),p_sale_price,COALESCE(p_item_discount,0),p_category_id,p_uom_id,p_product_notes,p_image_path,COALESCE(p_is_active,true),false,auth.uid())
    RETURNING item.item_id INTO v_item_id;
  ELSE
    UPDATE public.item SET item_name=btrim(p_item_name),sale_price=p_sale_price,item_discount=COALESCE(p_item_discount,item.item_discount),item_category_id=p_category_id,
      uom_id=p_uom_id,product_notes=p_product_notes,image_path=p_image_path,is_active=COALESCE(p_is_active,item.is_active),
      updated_by=auth.uid(),updated_on=now()
    WHERE item.item_id=p_item_id RETURNING item.item_id INTO v_item_id;
    IF v_item_id IS NULL THEN RAISE EXCEPTION 'Item not found or inaccessible' USING ERRCODE='P0002'; END IF;
  END IF;
  RETURN v_item_id;
END;
$function$
;
REVOKE ALL ON FUNCTION public.save_item(text,numeric,uuid,uuid,text,text,uuid,boolean,numeric) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_item(text,numeric,uuid,uuid,text,text,uuid,boolean,numeric) TO authenticated;

DROP FUNCTION IF EXISTS public.get_storefront_items();
CREATE OR REPLACE FUNCTION public.get_storefront_items()
 RETURNS TABLE(item_id uuid, item_name character varying, sale_price numeric, item_category_id uuid, image_path character varying, product_notes character varying, is_active boolean, is_stocked boolean, item_discount numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  SELECT i.item_id,i.item_name,i.sale_price,i.item_category_id,i.image_path,i.product_notes,i.is_active,
    private.item_has_available_stock(i.item_id),i.item_discount
  FROM public.item i WHERE i.is_active ORDER BY i.item_name,i.item_id;
$function$
;
REVOKE ALL ON FUNCTION public.get_storefront_items() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_storefront_items() TO anon,authenticated;

DROP FUNCTION IF EXISTS public.get_admin_items_with_stock(boolean);
CREATE OR REPLACE FUNCTION public.get_admin_items_with_stock(p_include_inactive boolean DEFAULT false)
 RETURNS TABLE(item_id uuid, item_name character varying, sale_price numeric, item_category_id uuid, uom_id uuid, image_path character varying, product_notes character varying, is_active boolean, is_stocked boolean, quantity_on_hand bigint, item_discount numeric)
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce(public.authorize('stock.read'),false) OR NOT coalesce(public.authorize('products.read'),false) THEN RAISE EXCEPTION 'You do not have permission to view item inventory' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT i.item_id,i.item_name,i.sale_price,i.item_category_id,i.uom_id,i.image_path,i.product_notes,i.is_active,
 coalesce(s.available,0)>0,coalesce(s.quantity,0),i.item_discount
 FROM public.item i LEFT JOIN (SELECT st.item_id,sum(st.quantity_at_hand)::bigint quantity,
 sum(CASE WHEN st.expiry_date IS NULL OR st.expiry_date>=current_date THEN st.quantity_at_hand-st.quantity_reserved ELSE 0 END)::bigint available FROM public.stock st GROUP BY st.item_id) s ON s.item_id=i.item_id
 WHERE i.is_active OR coalesce(p_include_inactive,false) ORDER BY i.item_name,i.item_id;
END $function$
;
REVOKE ALL ON FUNCTION public.get_admin_items_with_stock(boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_items_with_stock(boolean) TO authenticated;

CREATE OR REPLACE FUNCTION order_private.reserve_order(p_customer_id uuid, p_origin text, p_items jsonb, p_request_id uuid, p_notes text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE v_id uuid:=gen_random_uuid(); v_old order_private.requests; v_payload jsonb;
 l record; i record; s record; v_detail uuid; v_left integer; v_take integer; v_ids uuid[]; v_issues jsonb:='[]'; v_discount numeric; v_price numeric;
BEGIN
 IF p_origin NOT IN ('online','staff') OR p_origin IS NULL THEN RAISE EXCEPTION 'Invalid order origin.'; END IF;
 IF p_request_id IS NULL OR p_items IS NULL OR jsonb_typeof(p_items)<>'array' THEN RAISE EXCEPTION 'Invalid order request.'; END IF;
 IF jsonb_array_length(p_items) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'An order must contain 1–100 items.'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_items) e WHERE jsonb_typeof(e)<>'object' OR coalesce(e->>'item_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 OR coalesce(jsonb_typeof(e->'quantity'),'')<>'number' OR coalesce(e->>'quantity','') !~ '^[1-9][0-9]{0,2}$' OR coalesce(jsonb_typeof(e->'sale_price'),'')<>'number') THEN RAISE EXCEPTION 'Invalid items, prices or quantities (1–999).'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_items) e WHERE
   (e->>'sale_price')::numeric < 0 OR (e->>'sale_price')::numeric <> trunc((e->>'sale_price')::numeric)
   OR (e ? 'order_discount' AND (coalesce(jsonb_typeof(e->'order_discount'),'') <> 'number'))
   OR (e ? 'original_sale_price' AND (coalesce(jsonb_typeof(e->'original_sale_price'),'') <> 'number'))
 ) THEN RAISE EXCEPTION 'Prices must be whole nonnegative UGX amounts; discounts must be whole percentages from 0 to 100.' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_items) e WHERE
   (e ? 'order_discount' AND ((e->>'order_discount')::numeric NOT BETWEEN 0 AND 100 OR (e->>'order_discount')::numeric <> trunc((e->>'order_discount')::numeric)))
   OR (e ? 'original_sale_price' AND ((e->>'original_sale_price')::numeric < 0 OR (e->>'original_sale_price')::numeric <> trunc((e->>'original_sale_price')::numeric)))
 ) THEN RAISE EXCEPTION 'Prices must be whole nonnegative UGX amounts; discounts must be whole percentages from 0 to 100.' USING ERRCODE='22023'; END IF;
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
 FOR l IN SELECT * FROM jsonb_to_recordset(p_items) x(item_id uuid,quantity integer,sale_price numeric,order_discount numeric,original_sale_price numeric) ORDER BY item_id LOOP
  SELECT item_name,sale_price,item_discount,is_active INTO i FROM public.item WHERE item_id=l.item_id;
  IF NOT FOUND OR i.is_active IS NOT TRUE OR i.sale_price IS NULL OR i.sale_price<0 OR i.sale_price::text IN ('NaN','Infinity','-Infinity') THEN
   v_issues:=v_issues||jsonb_build_array(jsonb_build_object('item_id',l.item_id,'code','ITEM_UNAVAILABLE'));
  ELSE
   v_discount:=CASE WHEN p_origin='online' THEN i.item_discount ELSE coalesce(l.order_discount,0) END;
   v_price:=round(i.sale_price*(100-v_discount)/100);
   IF v_price<>l.sale_price OR (l.original_sale_price IS NOT NULL AND l.original_sale_price<>i.sale_price)
      OR (p_origin='online' AND l.order_discount IS NOT NULL AND l.order_discount<>i.item_discount) THEN
    v_issues:=v_issues||jsonb_build_array(jsonb_build_object('item_id',l.item_id,'code','PRICE_CHANGED',
      'previous_price',l.sale_price,'current_price',v_price,'original_sale_price',i.sale_price,'order_discount',v_discount));
   END IF;
   SELECT coalesce(sum(quantity_at_hand-quantity_reserved),0) AS available INTO s FROM public.stock WHERE item_id=l.item_id AND (expiry_date IS NULL OR expiry_date>=current_date);
   IF s.available<l.quantity THEN v_issues:=v_issues||jsonb_build_array(jsonb_build_object('item_id',l.item_id,'code','INSUFFICIENT_STOCK','requested',l.quantity,'available',s.available)); END IF;
  END IF;
 END LOOP;
 IF jsonb_array_length(v_issues)>0 THEN RAISE EXCEPTION 'Your order needs attention.' USING DETAIL=v_issues::text,ERRCODE='P0001'; END IF;
 INSERT INTO public."order"(order_id,added_by,added_on,customer_id,order_origin,expected_expiry_date,request_id,order_status,is_active,order_notes)
 VALUES(v_id,auth.uid(),clock_timestamp(),p_customer_id,p_origin,clock_timestamp()+interval '12 hours',p_request_id,'received',true,p_notes);
 FOR l IN SELECT * FROM jsonb_to_recordset(p_items) x(item_id uuid,quantity integer,sale_price numeric,order_discount numeric,original_sale_price numeric) ORDER BY item_id LOOP
  SELECT sale_price,item_discount INTO i FROM public.item WHERE item_id=l.item_id;
  v_discount:=CASE WHEN p_origin='online' THEN i.item_discount ELSE coalesce(l.order_discount,0) END;
  v_price:=round(i.sale_price*(100-v_discount)/100);
  INSERT INTO public.order_details(order_id,item_id,original_sale_price,order_discount,sale_price,quantity_sold)
    VALUES(v_id,l.item_id,i.sale_price,v_discount,v_price,l.quantity) RETURNING order_details_id INTO v_detail;
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
END $function$
;
NOTIFY pgrst, 'reload schema';
