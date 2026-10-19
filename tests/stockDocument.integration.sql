-- Run with a database administration connection. All test data is rolled back.
begin;
select set_config('request.jwt.claims', json_build_object('sub', (select user_id from public.user_roles where role='admin' limit 1), 'role','authenticated','user_role','admin')::text, true);
set local role authenticated;
do $test$
declare
 i uuid := (select item_id from public.item limit 1);
 v_purchase uuid; v_order uuid; v_return uuid; v_detail uuid;
 before_count bigint; failed boolean := false;
begin
 if i is null then raise exception 'Test needs an existing item'; end if;
 v_purchase := public.create_stock_document('purchase', '{"invoice_number":"TRANSACTION-TEST-ROLLBACK","purchase_notes":"Rollback test"}', jsonb_build_array(jsonb_build_object('item_id',i,'quantity',2,'unit_price',10),jsonb_build_object('item_id',i,'quantity',3,'unit_price',12)));
 if (select count(*) from public.purchase_details d where d.purchase_id = v_purchase) <> 2 then raise exception 'Purchase lines failed'; end if;
 v_order := public.create_stock_document('order', '{"order_notes":"Rollback test"}', jsonb_build_array(jsonb_build_object('item_id',i,'quantity',2,'unit_price',15),jsonb_build_object('item_id',i,'quantity',3,'unit_price',18)));
 if (select count(*) from public.order_details d where d.order_id = v_order) <> 2 then raise exception 'Order lines failed'; end if;
 select d.order_details_id into v_detail from public.order_details d where d.order_id = v_order limit 1;
 v_return := public.create_stock_document('item_return', jsonb_build_object('order_id',v_order), jsonb_build_array(jsonb_build_object('item_id',i,'order_details_id',v_detail,'quantity',1)));
 if (select count(*) from public.return_details d where d.return_id = v_return) <> 1 then raise exception 'Return lines failed'; end if;
 before_count := (select count(*) from public.purchase);
 begin
  perform public.create_stock_document('purchase', '{"invoice_number":"FAIL-ROLLBACK"}', jsonb_build_array(jsonb_build_object('item_id',i,'quantity',2,'unit_price',10),jsonb_build_object('item_id',i,'quantity',0,'unit_price',12)));
 exception when others then failed := true;
 end;
 if not failed or (select count(*) from public.purchase) <> before_count then raise exception 'Atomic rollback failed'; end if;
end;
$test$;
select 'combined documents and rollback passed' as verification;
rollback;
