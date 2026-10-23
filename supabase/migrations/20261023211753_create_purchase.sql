BEGIN;

-- Missing batch/expiry values are part of the stock identity, not wildcards.
-- Fail rather than silently merge existing inventory with duplicate identities.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.stock
        GROUP BY item_id, NULLIF(BTRIM(batch_number), ''), expiry_date
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Reconcile duplicate stock identities before installing create_purchase.';
    END IF;
END;
$$;

UPDATE public.stock SET batch_number = NULLIF(BTRIM(batch_number), '')
WHERE batch_number IS DISTINCT FROM NULLIF(BTRIM(batch_number), '');

-- The old constraint prevents the same batch from having different expiry dates.
ALTER TABLE public.stock DROP CONSTRAINT unique_item_batch;
CREATE UNIQUE INDEX stock_item_batch_expiry_unique
    ON public.stock (item_id, batch_number, expiry_date) NULLS NOT DISTINCT;

CREATE OR REPLACE FUNCTION public.create_purchase(
    p_invoice_number TEXT,
    p_items_json JSONB,
    p_supplier_id UUID DEFAULT NULL,
    p_purchase_notes TEXT DEFAULT NULL,
    p_added_on TIMESTAMPTZ DEFAULT NOW()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_purchase_id UUID := gen_random_uuid();
    v_item_record RECORD;
    v_batch_number TEXT;
BEGIN
    -- Authorization is enforced by the existing table RLS policies.
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated user.' USING ERRCODE = '28000';
    END IF;
    IF NULLIF(BTRIM(p_invoice_number), '') IS NULL THEN
        RAISE EXCEPTION 'Invoice number is required.' USING ERRCODE = '22023';
    END IF;
    IF p_items_json IS NULL OR jsonb_typeof(p_items_json) <> 'array' THEN
        RAISE EXCEPTION 'Purchase items must be an array.' USING ERRCODE = '22023';
    END IF;
    IF jsonb_array_length(p_items_json) = 0 THEN
        RAISE EXCEPTION 'A purchase must contain at least one item.' USING ERRCODE = '22023';
    END IF;
    IF p_added_on IS NULL OR NOT isfinite(p_added_on) THEN
        RAISE EXCEPTION 'A valid purchase date is required.' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.purchase (
        purchase_id, supplier_id, invoice_number, added_by, added_on, purchase_notes
    ) VALUES (
        v_purchase_id, p_supplier_id, BTRIM(p_invoice_number), auth.uid(),
        p_added_on, NULLIF(BTRIM(p_purchase_notes), '')
    );

    FOR v_item_record IN
        SELECT * FROM jsonb_to_recordset(p_items_json) AS x(
            item_id UUID, quantity_bought INTEGER, cost_price NUMERIC,
            batch_number TEXT, expiry_date DATE
        )
    LOOP
        v_batch_number := NULLIF(BTRIM(v_item_record.batch_number), '');
        IF v_item_record.item_id IS NULL THEN
            RAISE EXCEPTION 'Item ID is required.' USING ERRCODE = '22023';
        END IF;
        IF v_item_record.quantity_bought IS NULL OR v_item_record.quantity_bought <= 0 THEN
            RAISE EXCEPTION 'Quantity bought must be a positive whole number.' USING ERRCODE = '22023';
        END IF;
        IF v_item_record.cost_price IS NULL
            OR v_item_record.cost_price::TEXT IN ('NaN', 'Infinity', '-Infinity')
            OR v_item_record.cost_price < 0 OR v_item_record.cost_price > 9999999999.99
            OR v_item_record.cost_price <> ROUND(v_item_record.cost_price, 2)
        THEN
            RAISE EXCEPTION 'Enter a nonnegative cost price with up to two decimal places.' USING ERRCODE = '22023';
        END IF;

        INSERT INTO public.purchase_details (
            purchase_details_id, purchase_id, item_id, quantity_bought,
            cost_price, batch_number, expiry_date
        ) VALUES (
            gen_random_uuid(), v_purchase_id, v_item_record.item_id,
            v_item_record.quantity_bought, v_item_record.cost_price,
            v_batch_number, v_item_record.expiry_date
        );

        INSERT INTO public.stock AS current_stock (
            stock_id, item_id, batch_number, expiry_date, quantity_at_hand, cost_price
        ) VALUES (
            gen_random_uuid(), v_item_record.item_id, v_batch_number,
            v_item_record.expiry_date, v_item_record.quantity_bought, v_item_record.cost_price
        )
        ON CONFLICT (item_id, batch_number, expiry_date)
        DO UPDATE SET
            quantity_at_hand = COALESCE(current_stock.quantity_at_hand, 0) + EXCLUDED.quantity_at_hand,
            cost_price = ROUND(
                (current_stock.cost_price * COALESCE(current_stock.quantity_at_hand, 0)
                    + EXCLUDED.cost_price * EXCLUDED.quantity_at_hand)
                / (COALESCE(current_stock.quantity_at_hand, 0)::NUMERIC + EXCLUDED.quantity_at_hand), 2
            );
    END LOOP;
    RETURN v_purchase_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_purchase(TEXT, JSONB, UUID, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_purchase(TEXT, JSONB, UUID, TEXT, TIMESTAMPTZ) TO authenticated;

-- Superseded function bypasses RLS and relies on the removed two-column identity.
REVOKE EXECUTE ON FUNCTION public.process_secure_purchase(VARCHAR, VARCHAR, VARCHAR, JSONB)
    FROM PUBLIC, anon, authenticated;

COMMIT;
