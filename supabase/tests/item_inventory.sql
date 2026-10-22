-- Run with a database owner connection. Fixtures and writes are rolled back.
BEGIN;
DO $test$
DECLARE
  active_id uuid := gen_random_uuid(); hidden_id uuid := gen_random_uuid(); empty_id uuid := gen_random_uuid();
  saved_id uuid; qty bigint;
BEGIN
  INSERT INTO public.item(item_id,item_name,sale_price,is_active) VALUES
    (active_id,'Inventory test active',10,true),(hidden_id,'Inventory test hidden',10,false),(empty_id,'Inventory test empty',10,true);
  INSERT INTO public.stock(stock_id,item_id,batch_number,expiry_date,quantity_at_hand,cost_price) VALUES
    (gen_random_uuid(),active_id,'TEST-A','2027-01-01',5,1),
    (gen_random_uuid(),active_id,'TEST-B','2028-01-01',3,2),
    (gen_random_uuid(),active_id,'TEST-C',NULL,NULL,2);
  PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","user_role":"staff"}',true);
  SET LOCAL ROLE authenticated;
  SELECT quantity_on_hand INTO qty FROM public.get_admin_items_with_stock(true) WHERE item_id=active_id;
  IF qty IS DISTINCT FROM 8 THEN RAISE EXCEPTION 'Batch sum failed: %',qty; END IF;
  SELECT quantity_on_hand INTO qty FROM public.get_admin_items_with_stock(true) WHERE item_id=empty_id;
  IF qty IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'Zero stock failed'; END IF;
  IF EXISTS(SELECT 1 FROM public.get_admin_items_with_stock(false) WHERE item_id=hidden_id) THEN RAISE EXCEPTION 'Active filter failed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.get_admin_items_with_stock(true) WHERE item_id=hidden_id) THEN RAISE EXCEPTION 'Staff visibility failed'; END IF;
  saved_id:=public.save_item('Inventory saved',2,NULL,NULL,'test',NULL,NULL,false);
  PERFORM public.save_item('Inventory updated',3,NULL,NULL,'test',NULL,saved_id,true);
  PERFORM public.save_item('Inventory updated',3,NULL,NULL,'test',NULL,saved_id,NULL);
  IF NOT EXISTS(SELECT 1 FROM public.item WHERE item_id=saved_id AND is_active AND added_by=auth.uid() AND updated_by=auth.uid()) THEN RAISE EXCEPTION 'Save/audit/preserve active failed'; END IF;
  BEGIN
    PERFORM public.save_item('Invalid price',-1,NULL,NULL,'test');
    RAISE EXCEPTION 'Negative price accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated","user_role":"customer"}',true);
  SET LOCAL ROLE authenticated;
  IF EXISTS(SELECT 1 FROM public.item WHERE item_id=hidden_id) THEN RAISE EXCEPTION 'Customer sees hidden item'; END IF;
  IF EXISTS(SELECT 1 FROM public.stock WHERE item_id=active_id) THEN RAISE EXCEPTION 'Customer sees quantities'; END IF;
  BEGIN
    PERFORM public.get_admin_items_with_stock(true); RAISE EXCEPTION 'Customer inventory allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM public.save_item('Forbidden',1,NULL,NULL,'test'); RAISE EXCEPTION 'Customer write allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims','{"role":"anon"}',true);
  SET LOCAL ROLE anon;
  IF EXISTS(SELECT 1 FROM public.get_storefront_items() WHERE item_id=hidden_id) THEN RAISE EXCEPTION 'Public sees hidden item'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.get_storefront_items() WHERE item_id=active_id AND is_stocked) THEN RAISE EXCEPTION 'Availability failed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.get_storefront_items() WHERE item_id=empty_id AND NOT is_stocked) THEN RAISE EXCEPTION 'Empty availability failed'; END IF;
  BEGIN
    PERFORM 1 FROM public.stock LIMIT 1; RAISE EXCEPTION 'Anonymous stock access allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  RESET ROLE;
  IF EXISTS(SELECT 1 FROM pg_proc WHERE oid='public.get_storefront_items()'::regprocedure AND 'quantity_on_hand'=ANY(proargnames)) THEN RAISE EXCEPTION 'Quantity in storefront response'; END IF;
  IF has_function_privilege('anon','public.get_admin_items_with_stock(boolean)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous inventory RPC allowed'; END IF;
END $test$;
ROLLBACK;
SELECT 'PASS: item inventory, visibility, privileges and save checks; fixtures rolled back' AS verification;
