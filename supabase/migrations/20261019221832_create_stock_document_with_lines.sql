-- One RPC call creates a complete document; any failed line rolls back the parent.
create or replace function public.create_stock_document(p_entity text, p_parent jsonb, p_lines jsonb)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
    document_id uuid := coalesce(nullif(p_parent->>'document_id', '')::uuid, gen_random_uuid());
    actor uuid := auth.uid();
    line jsonb;
    quantity numeric;
    price numeric;
    source public.order_details%rowtype;
    v_original_order_id uuid;
    document_date timestamptz := coalesce(nullif(p_parent->>'added_on', '')::timestamptz, now());
begin
    if actor is null then raise exception 'Please sign in to save this document.'; end if;
    if p_entity not in ('order', 'purchase', 'item_return') or p_entity is null then raise exception 'Unknown document type.'; end if;
    if jsonb_typeof(p_lines) is distinct from 'array' then raise exception 'Item lines must be an array.'; end if;
    if jsonb_array_length(p_lines) = 0 then raise exception 'Add at least one item before saving.'; end if;
    if p_entity = 'order' then
        insert into public."order"(order_id, added_by, added_on, order_notes, order_status, is_active)
        values(document_id, actor, document_date, nullif(btrim(p_parent->>'order_notes'), ''), coalesce(nullif(p_parent->>'order_status',''), 'received')::public.order_status, true);
    elsif p_entity = 'purchase' then
        if nullif(btrim(p_parent->>'invoice_number'), '') is null then raise exception 'Enter an invoice number.'; end if;
        insert into public.purchase(purchase_id, supplier_id, invoice_number, added_by, added_on, purchase_notes, is_active)
        values(document_id, nullif(p_parent->>'supplier_id','')::uuid, btrim(p_parent->>'invoice_number'), actor, document_date, nullif(btrim(p_parent->>'purchase_notes'), ''), true);
    else
        v_original_order_id := nullif(p_parent->>'order_id','')::uuid;
        if v_original_order_id is null or not exists(select 1 from public."order" o where o.order_id = v_original_order_id) then raise exception 'Select an accessible order for this return.'; end if;
        insert into public.item_return(return_id, order_id, added_by, added_on, return_notes, return_status, is_active)
        values(document_id, v_original_order_id, actor, document_date at time zone 'UTC', nullif(btrim(p_parent->>'return_notes'), ''), coalesce(nullif(p_parent->>'return_status',''), 'received')::public.return_status, true);
    end if;
    for line in select value from jsonb_array_elements(p_lines) loop
        quantity := (line->>'quantity')::numeric;
        if quantity is null or quantity <= 0 or quantity <> trunc(quantity) or quantity > 2147483647 then raise exception 'Each quantity must be a positive whole number.'; end if;
        if nullif(line->>'item_id','') is null then raise exception 'Select an item for every line.'; end if;
        if p_entity = 'item_return' then
            select d.* into source from public.order_details d
            where d.order_details_id = nullif(line->>'order_details_id','')::uuid and d.order_id = v_original_order_id;
            if not found or source.item_id is distinct from (line->>'item_id')::uuid then raise exception 'Each returned item must belong to the selected order.'; end if;
            if (select sum((x->>'quantity')::numeric) from jsonb_array_elements(p_lines) x where x->>'order_details_id' = line->>'order_details_id') > coalesce(source.quantity_sold, 0) then raise exception 'Returned quantity exceeds the quantity on the original order line.'; end if;
            insert into public.return_details(return_details_id, return_id, item_id, quantity_returned, batch_number, expiry_date)
            values(gen_random_uuid(), document_id, source.item_id, quantity::integer, source.batch_number, source.expiry_date);
        else
            price := (line->>'unit_price')::numeric;
            if price is null or price < 0 or price::text in ('NaN', 'Infinity', '-Infinity') then raise exception 'Each price must be zero or greater.'; end if;
            if p_entity = 'order' then
                insert into public.order_details(order_id, item_id, quantity_sold, sale_price, batch_number, expiry_date)
                values(document_id, (line->>'item_id')::uuid, quantity::integer, price, nullif(btrim(line->>'batch_number'), ''), nullif(line->>'expiry_date','')::date);
            else
                insert into public.purchase_details(purchase_id, item_id, quantity_bought, cost_price, batch_number, expiry_date)
                values(document_id, (line->>'item_id')::uuid, quantity::integer, price, nullif(btrim(line->>'batch_number'), ''), nullif(line->>'expiry_date','')::date);
            end if;
        end if;
    end loop;
    return document_id;
end;
$$;
revoke all on function public.create_stock_document(text, jsonb, jsonb) from public, anon;
grant execute on function public.create_stock_document(text, jsonb, jsonb) to authenticated;
