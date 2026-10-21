-- Targets the current public.item / stock / "order" / order_details schema.
-- The CLI could not create this file because its home configuration directory is read-only.
-- All order writes and stock allocations happen within the caller's transaction.
create schema if not exists checkout_private;
revoke all on schema checkout_private from public, anon;
grant usage on schema checkout_private to authenticated;

create table checkout_private.requests (
  user_id uuid not null references auth.users(id),
  request_id uuid not null,
  payload jsonb not null,
  result jsonb not null,
  primary key (user_id, request_id)
);
alter table checkout_private.requests enable row level security;
revoke all on checkout_private.requests from public, anon, authenticated;
create index if not exists stock_checkout_item_idx on public.stock(item_id);

-- Privilege elevation is confined to this non-exposed schema. Customers must
-- not receive direct UPDATE stock privileges or supply authoritative order prices.
create function checkout_private.process_cart(p_items jsonb, p_request_id uuid, p_confirm boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_line record;
  v_item record;
  v_stock record;
  v_remaining integer;
  v_take integer;
  v_order uuid;
  v_total numeric := 0;
  v_lines jsonb := '[]'::jsonb;
  v_result jsonb;
  v_previous record;
begin
  if v_user is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception 'Please log in to check out.';
  end if;
  if p_request_id is null or p_confirm is null then raise exception 'Invalid checkout request.'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'Invalid cart.'; end if;
  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 100 then
    raise exception 'Cart must contain between 1 and 100 products.';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) e
    where jsonb_typeof(e) <> 'object'
       or coalesce(jsonb_typeof(e->'itemId'), '') <> 'string'
       or coalesce(e->>'itemId', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or coalesce(jsonb_typeof(e->'quantity'), '') <> 'number'
       or coalesce(e->>'quantity', '') !~ '^[1-9][0-9]{0,2}$'
       or coalesce(jsonb_typeof(e->'salePrice'), '') <> 'number'
  ) then raise exception 'Invalid cart item or quantity (1–999 required).'; end if;
  if (select count(distinct (e->>'itemId')::uuid) from jsonb_array_elements(p_items) e) <> jsonb_array_length(p_items) then
    raise exception 'Duplicate products are not allowed.';
  end if;

  -- Serializes retries for this user and key, including concurrent requests.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text || p_request_id::text, 0));
  select * into v_previous from checkout_private.requests where user_id = v_user and request_id = p_request_id;
  if found then
    if v_previous.payload <> p_items then raise exception 'This checkout request was already used for a different cart.'; end if;
    return v_previous.result;
  end if;

  -- Lock products and all their stock rows in deterministic order. Stock
  -- updates from other transactions must wait, preventing overselling.
  perform i.item_id from public.item i
    join jsonb_to_recordset(p_items) as x("itemId" uuid) on i.item_id = x."itemId"
    order by i.item_id for update of i;
  perform s.stock_id from public.stock s
    join jsonb_to_recordset(p_items) as x("itemId" uuid) on s.item_id = x."itemId"
    order by s.item_id, s.stock_id for update of s;

  for v_line in select * from jsonb_to_recordset(p_items) as x("itemId" uuid, quantity integer, "salePrice" numeric) order by "itemId" loop
    select item_id, item_name, sale_price, is_active into v_item from public.item where item_id = v_line."itemId";
    if not found or v_item.is_active is false then raise exception 'A product is no longer available. Please update your cart.'; end if;
    if v_item.sale_price is null or v_item.sale_price < 0 then raise exception 'Product price is unavailable.'; end if;
    if (select coalesce(sum(greatest(quantity_at_hand, 0)), 0) from public.stock
        where item_id = v_line."itemId" and (expiry_date is null or expiry_date >= current_date)) < v_line.quantity then
      raise exception 'Not enough stock for %. Please reduce the quantity or remove it.', v_item.item_name;
    end if;
    if p_confirm and v_item.sale_price <> v_line."salePrice" then
      raise exception 'Prices have changed. Please review your cart again before confirming.';
    end if;
    v_total := v_total + v_item.sale_price * v_line.quantity;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object('itemId', v_item.item_id,
      'itemName', v_item.item_name, 'quantity', v_line.quantity, 'salePrice', v_item.sale_price));
  end loop;
  v_result := jsonb_build_object('total', v_total, 'lines', v_lines);
  if not p_confirm then return v_result; end if;

  insert into public."order"(added_by, order_status, is_active)
    values (v_user, 'received', true) returning order_id into v_order;
  for v_line in select * from jsonb_to_recordset(v_lines) as x("itemId" uuid, quantity integer, "salePrice" numeric) order by "itemId" loop
    v_remaining := v_line.quantity;
    -- Allocate earliest expiring batches first, preserving batch traceability.
    for v_stock in select * from public.stock where item_id = v_line."itemId" and quantity_at_hand > 0
      and (expiry_date is null or expiry_date >= current_date)
      order by expiry_date nulls last, stock_id loop
      v_take := least(v_remaining, v_stock.quantity_at_hand);
      update public.stock set quantity_at_hand = quantity_at_hand - v_take where stock_id = v_stock.stock_id;
      insert into public.order_details(order_id, item_id, sale_price, quantity_sold, batch_number, expiry_date)
        values(v_order, v_line."itemId", v_line."salePrice", v_take, v_stock.batch_number, v_stock.expiry_date);
      v_remaining := v_remaining - v_take;
      exit when v_remaining = 0;
    end loop;
    if v_remaining <> 0 then raise exception 'Stock allocation failed. Please try again.'; end if;
  end loop;
  v_result := v_result || jsonb_build_object('orderId', v_order);
  insert into checkout_private.requests values(v_user, p_request_id, p_items, v_result);
  return v_result;
end;
$$;
revoke all on function checkout_private.process_cart(jsonb, uuid, boolean) from public, anon;
grant execute on function checkout_private.process_cart(jsonb, uuid, boolean) to authenticated;

create function public.cart_checkout(p_items jsonb, p_request_id uuid, p_confirm boolean default false)
returns jsonb language sql security invoker set search_path = ''
as $$ select checkout_private.process_cart(p_items, p_request_id, p_confirm); $$;
revoke all on function public.cart_checkout(jsonb, uuid, boolean) from public, anon;
grant execute on function public.cart_checkout(jsonb, uuid, boolean) to authenticated;

-- Existing privileged staff policies remain; customer writes must use the RPC
-- so fabricated prices and orders without stock allocation cannot be inserted.
drop policy if exists "customers staff and admin can add order" on public."order";
drop policy if exists "customers staff and admin can add order details" on public.order_details;
create policy "Staff can insert orders" on public."order" for insert to authenticated
  with check ((select public.authorize('orders.create')) and (select auth.jwt()->>'user_role') in ('staff', 'admin'));
create policy "Staff can insert order details" on public.order_details for insert to authenticated
  with check ((select public.authorize('order_details.create')) and (select auth.jwt()->>'user_role') in ('staff', 'admin'));
alter table public."order" enable row level security;
alter table public.order_details enable row level security;
