-- Dedicated purchase regression checks. Run as database owner; all fixtures roll back.
BEGIN;
SELECT set_config('request.jwt.claims', json_build_object(
    'sub', (SELECT user_id FROM public.user_roles WHERE role = 'staff' LIMIT 1),
    'role', 'authenticated', 'user_role', 'staff')::TEXT, TRUE);
DO $test$
DECLARE
    i UUID := gen_random_uuid();
    v_purchase_id UUID;
    other_purchase UUID;
    before_count BIGINT;
    before_lines BIGINT;
    before_quantity BIGINT;
    before_cost NUMERIC;
    invalid_lines JSONB;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Test needs an existing staff user.'; END IF;
    INSERT INTO public.item(item_id, item_name, sale_price, is_active)
        VALUES (i, 'Purchase regression fixture', 30, TRUE);
    SET LOCAL ROLE authenticated;
    v_purchase_id := public.create_purchase(' PURCHASE-REGRESSION ', jsonb_build_array(
        jsonb_build_object('item_id', i, 'quantity_bought', 2, 'cost_price', 10, 'batch_number', ' '),
        jsonb_build_object('item_id', i, 'quantity_bought', 3, 'cost_price', 20)
    ), p_added_on => '2000-01-01T00:00:00Z');
    IF NOT EXISTS (SELECT 1 FROM public.purchase p WHERE p.purchase_id = v_purchase_id
        AND invoice_number = 'PURCHASE-REGRESSION' AND added_by = auth.uid()
        AND added_on = NOW() AND supplier_id IS NULL)
    THEN RAISE EXCEPTION 'Purchase header, date, optional supplier or audit failed.'; END IF;
    IF (SELECT COUNT(*) FROM public.purchase_details d WHERE d.purchase_id = v_purchase_id) <> 2
    THEN RAISE EXCEPTION 'Purchase detail count failed.'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.stock WHERE item_id = i AND batch_number IS NULL
        AND expiry_date IS NULL AND quantity_at_hand = 5 AND cost_price = 16)
    THEN RAISE EXCEPTION 'NULL identity or weighted average failed.'; END IF;
    other_purchase := public.create_purchase('BATCH-REGRESSION', jsonb_build_array(
        jsonb_build_object('item_id', i, 'quantity_bought', 2, 'cost_price', 12, 'batch_number', ' B1 ', 'expiry_date', '2027-01-01'),
        jsonb_build_object('item_id', i, 'quantity_bought', 1, 'cost_price', 18, 'batch_number', 'B1', 'expiry_date', '2027-01-01'),
        jsonb_build_object('item_id', i, 'quantity_bought', 4, 'cost_price', 7, 'batch_number', 'B1', 'expiry_date', '2028-01-01'),
        jsonb_build_object('item_id', i, 'quantity_bought', 1, 'cost_price', 3, 'batch_number', 'B1'),
        jsonb_build_object('item_id', i, 'quantity_bought', 2, 'cost_price', 6, 'expiry_date', '2027-01-01')
    ));
    PERFORM public.create_purchase('REPEAT-IDENTITIES', jsonb_build_array(
        jsonb_build_object('item_id', i, 'quantity_bought', 1, 'cost_price', 9, 'batch_number', 'B1'),
        jsonb_build_object('item_id', i, 'quantity_bought', 2, 'cost_price', 10, 'expiry_date', '2027-01-01')
    ));
    IF (SELECT COUNT(*) FROM public.stock WHERE item_id = i) <> 5
    THEN RAISE EXCEPTION 'Batch/expiry separation failed.'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.stock WHERE item_id = i AND batch_number = 'B1'
        AND expiry_date = '2027-01-01' AND quantity_at_hand = 3 AND cost_price = 14)
        OR NOT EXISTS (SELECT 1 FROM public.stock WHERE item_id = i AND batch_number = 'B1'
        AND expiry_date IS NULL AND quantity_at_hand = 2 AND cost_price = 6)
        OR NOT EXISTS (SELECT 1 FROM public.stock WHERE item_id = i AND batch_number IS NULL
        AND expiry_date = '2027-01-01' AND quantity_at_hand = 4 AND cost_price = 8)
    THEN RAISE EXCEPTION 'Partial NULL identity or batch weighted average failed.'; END IF;

    SELECT COUNT(*) INTO before_count FROM public.purchase;
    SELECT COUNT(*) INTO before_lines FROM public.purchase_details;
    SELECT SUM(quantity_at_hand), SUM(quantity_at_hand * cost_price)
        INTO before_quantity, before_cost FROM public.stock WHERE item_id = i;
    FOR invalid_lines IN SELECT jsonb_build_array(
        jsonb_build_object('item_id', i, 'quantity_bought', 8, 'cost_price', 1), bad
    ) FROM (VALUES
        (jsonb_build_object('item_id', i, 'quantity_bought', 0, 'cost_price', 12)),
        (jsonb_build_object('item_id', i, 'quantity_bought', -1, 'cost_price', 12)),
        (jsonb_build_object('item_id', i, 'quantity_bought', 1, 'cost_price', -1)),
        (jsonb_build_object('item_id', i, 'quantity_bought', 1, 'cost_price', 'NaN')),
        (jsonb_build_object('item_id', i, 'quantity_bought', 1, 'cost_price', 'Infinity')),
        (jsonb_build_object('item_id', i, 'quantity_bought', 1, 'cost_price', 1.234)),
        (jsonb_build_object('item_id', i, 'quantity_bought', 1.5, 'cost_price', 1)),
        (jsonb_build_object('item_id', i, 'quantity_bought', 2147483648::BIGINT, 'cost_price', 1)),
        (jsonb_build_object('item_id', gen_random_uuid(), 'quantity_bought', 1, 'cost_price', 1))
    ) AS invalid(bad)
    LOOP
        BEGIN
            PERFORM public.create_purchase('MUST-ROLL-BACK', invalid_lines);
            RAISE EXCEPTION 'Invalid purchase accepted.';
        EXCEPTION WHEN invalid_parameter_value OR invalid_text_representation
            OR numeric_value_out_of_range OR foreign_key_violation THEN NULL;
        END;
        IF (SELECT COUNT(*) FROM public.purchase) <> before_count
            OR (SELECT COUNT(*) FROM public.purchase_details) <> before_lines
            OR (SELECT SUM(quantity_at_hand) FROM public.stock WHERE item_id = i) <> before_quantity
            OR (SELECT SUM(quantity_at_hand * cost_price) FROM public.stock WHERE item_id = i) <> before_cost
        THEN RAISE EXCEPTION 'Partial purchase persisted after failure.'; END IF;
    END LOOP;
    FOR invalid_lines IN SELECT value FROM jsonb_array_elements('[[], {}, null]'::JSONB)
    LOOP
        BEGIN
            PERFORM public.create_purchase('BAD-ARRAY', invalid_lines);
            RAISE EXCEPTION 'Invalid item array accepted.';
        EXCEPTION WHEN invalid_parameter_value THEN NULL;
        END;
    END LOOP;
    BEGIN
        PERFORM public.create_purchase(' ', jsonb_build_array(jsonb_build_object('item_id', i, 'quantity_bought', 1, 'cost_price', 1)));
        RAISE EXCEPTION 'Blank invoice accepted.';
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;
    RESET ROLE;

    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', auth.uid(),
        'role', 'authenticated', 'user_role', 'customer')::TEXT, TRUE);
    SET LOCAL ROLE authenticated;
    BEGIN
        PERFORM public.create_purchase('FORBIDDEN', jsonb_build_array(jsonb_build_object('item_id', i, 'quantity_bought', 1, 'cost_price', 1)));
        RAISE EXCEPTION 'Customer purchase accepted.';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    RESET ROLE;
    IF (SELECT COUNT(*) FROM public.purchase) <> before_count
    THEN RAISE EXCEPTION 'Unauthorized purchase persisted.'; END IF;
    IF has_function_privilege('anon', 'public.create_purchase(text,jsonb,uuid,text,timestamptz)', 'EXECUTE')
        OR NOT has_function_privilege('authenticated', 'public.create_purchase(text,jsonb,uuid,text,timestamptz)', 'EXECUTE')
        OR has_function_privilege('authenticated', 'public.process_secure_purchase(varchar,varchar,varchar,jsonb)', 'EXECUTE')
    THEN RAISE EXCEPTION 'RPC grants failed.'; END IF;
    IF (SELECT prosecdef FROM pg_proc WHERE oid = 'public.create_purchase(text,jsonb,uuid,text,timestamptz)'::REGPROCEDURE)
    THEN RAISE EXCEPTION 'Purchase RPC bypasses caller RLS.'; END IF;
    PERFORM set_config('request.jwt.claims', '{"role":"authenticated"}', TRUE);
    SET LOCAL ROLE authenticated;
    BEGIN
        PERFORM public.create_purchase('NO-SESSION', '[]'::JSONB);
        RAISE EXCEPTION 'Missing user session accepted.';
    EXCEPTION WHEN invalid_authorization_specification THEN NULL;
    END;
    RESET ROLE;
END;
$test$;
ROLLBACK;
SELECT 'PASS: purchase headers, lines, stock identities, costing, validation, rollback and RLS; fixtures rolled back' AS verification;
