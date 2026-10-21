-- Run after the migration inside BEGIN ... ROLLBACK. Uses only transient fixtures.
do $$
declare
  v_user uuid;
  v_item uuid := gen_random_uuid();
  v_key uuid := gen_random_uuid();
  v_payload jsonb;
  v_quote jsonb;
  v_order jsonb;
  v_count integer;
begin
  select id into v_user from auth.users limit 1;
  if v_user is null then raise exception 'Test requires one auth user.'; end if;
  insert into public.item(item_id,item_name,sale_price,is_active) values(v_item,'Checkout regression fixture',12.50,true);
  insert into public.stock(stock_id,item_id,batch_number,quantity_at_hand,cost_price,expiry_date)
    values(gen_random_uuid(),v_item,'test-early',2,5,current_date+1),
          (gen_random_uuid(),v_item,'test-later',3,5,current_date+3),
          (gen_random_uuid(),v_item,'test-expired',50,5,current_date-1);
  v_payload := jsonb_build_array(jsonb_build_object('itemId',v_item,'quantity',3,'salePrice',12.50));
  perform set_config('request.jwt.claims', jsonb_build_object('sub',v_user,'role','authenticated','is_anonymous',false)::text,true);
  if has_function_privilege('anon','public.cart_checkout(jsonb,uuid,boolean)','execute') then raise exception 'Guest RPC privilege leak'; end if;
  if has_table_privilege('authenticated','checkout_private.requests','select') then raise exception 'Receipt privilege leak'; end if;
  v_quote := public.cart_checkout(v_payload,v_key,false);
  if (v_quote->>'total')::numeric <> 37.50 then raise exception 'Incorrect quote'; end if;
  if (select sum(quantity_at_hand) from public.stock where item_id=v_item) <> 55 then raise exception 'Quote changed stock'; end if;
  begin
    perform public.cart_checkout(v_payload||v_payload,v_key,false);
    raise exception using errcode='XX000',message='Duplicates accepted';
  exception when raise_exception then null; end;
  begin
    perform public.cart_checkout(jsonb_set(v_payload,'{0,quantity}','0'),v_key,false);
    raise exception using errcode='XX000',message='Zero quantity accepted';
  exception when raise_exception then null; end;
  begin
    perform public.cart_checkout(jsonb_set(v_payload,'{0,quantity}','6'),v_key,false);
    raise exception using errcode='XX000',message='Expired stock counted';
  exception when raise_exception then null; end;
  begin
    perform public.cart_checkout(jsonb_set(v_payload,'{0,salePrice}','1'),v_key,true);
    raise exception using errcode='XX000',message='Tampered price accepted';
  exception when raise_exception then null; end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_user,'role','authenticated','is_anonymous',true)::text,true);
  begin
    perform public.cart_checkout(v_payload,v_key,false);
    raise exception using errcode='XX000',message='Anonymous account accepted';
  exception when raise_exception then null; end;
  perform set_config('request.jwt.claims','{}',true);
  begin
    perform public.cart_checkout(v_payload,v_key,false);
    raise exception using errcode='XX000',message='Guest accepted';
  exception when raise_exception then null; end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_user,'role','authenticated','is_anonymous',false)::text,true);
  v_order := public.cart_checkout(v_payload,v_key,true);
  if v_order->>'orderId' is null then raise exception 'No order created'; end if;
  if public.cart_checkout(v_payload,v_key,true) <> v_order then raise exception 'Retry result changed'; end if;
  select count(*) into v_count from public.order_details where order_id=(v_order->>'orderId')::uuid;
  if v_count <> 2 then raise exception 'Batch allocation or retry created wrong number of lines'; end if;
  if (select quantity_at_hand from public.stock where item_id=v_item and batch_number='test-early') <> 0 then raise exception 'Early batch not consumed first'; end if;
  if (select quantity_at_hand from public.stock where item_id=v_item and batch_number='test-later') <> 2 then raise exception 'Wrong remaining stock'; end if;
  if (select quantity_at_hand from public.stock where item_id=v_item and batch_number='test-expired') <> 50 then raise exception 'Expired batch consumed'; end if;
  begin
    perform public.cart_checkout(jsonb_set(v_payload,'{0,quantity}','1'),v_key,true);
    raise exception using errcode='XX000',message='Request ID reused with different payload';
  exception when raise_exception then null; end;
end $$;
