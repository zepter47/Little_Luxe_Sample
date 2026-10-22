-- Read-time availability avoids cached is_stocked races. No stock quantities are public.
BEGIN;
ALTER TABLE public.item ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;
UPDATE public.item SET is_active = true WHERE is_active IS NULL;
ALTER TABLE public.item ALTER COLUMN is_active SET DEFAULT true, ALTER COLUMN is_active SET NOT NULL,
  ALTER COLUMN is_stocked SET DEFAULT false;
ALTER TABLE public.item ADD CONSTRAINT item_sale_price_nonnegative CHECK (sale_price >= 0 AND sale_price <> 'NaN'::numeric);
CREATE INDEX IF NOT EXISTS stock_item_id_inventory_idx ON public.stock(item_id);
DROP POLICY "All can view items" ON public.item;
CREATE POLICY items_public_read_active ON public.item FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY items_staff_read_inactive ON public.item FOR SELECT TO authenticated
  USING ((SELECT public.authorize('products.update')));
-- Existing INSERT/UPDATE policies already enforce products.create/products.update.
ALTER POLICY "admin and staff can add item" ON public.item RENAME TO items_authorized_create;
ALTER POLICY "admin and staff can update item" ON public.item RENAME TO items_authorized_update;
DROP POLICY "only admin can delete item" ON public.item;
REVOKE DELETE ON public.item FROM anon, authenticated;
GRANT SELECT ON public.item TO anon, authenticated;
GRANT INSERT, UPDATE ON public.item TO authenticated;
ALTER POLICY "admin and staff can view stock" ON public.stock RENAME TO stock_authorized_read_quantities;
GRANT SELECT ON public.stock TO authenticated;
REVOKE ALL ON public.stock FROM anon;
-- Retire the unsafe name-based entry point without deleting its definition.
REVOKE ALL ON FUNCTION public.add_item_with_category_name(varchar,numeric,numeric,integer,integer,varchar,varchar,varchar,varchar,varchar) FROM PUBLIC, anon, authenticated;

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO anon, authenticated;
CREATE OR REPLACE FUNCTION private.item_has_available_stock(p_item_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.item i WHERE i.item_id = p_item_id
      AND (i.is_active OR public.authorize('products.update'))
      AND (SELECT COALESCE(SUM(s.quantity_at_hand),0) > 0 FROM public.stock s WHERE s.item_id=i.item_id)
  );
$$;
REVOKE ALL ON FUNCTION private.item_has_available_stock(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.item_has_available_stock(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_storefront_items()
RETURNS TABLE(item_id uuid,item_name varchar,sale_price numeric,item_category_id uuid,image_path varchar,product_notes varchar,is_active boolean,is_stocked boolean)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT i.item_id,i.item_name,i.sale_price,i.item_category_id,i.image_path,i.product_notes,i.is_active,
    private.item_has_available_stock(i.item_id)
  FROM public.item i WHERE i.is_active ORDER BY i.item_name,i.item_id;
$$;
REVOKE ALL ON FUNCTION public.get_storefront_items() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_storefront_items() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_items_with_stock(p_include_inactive boolean DEFAULT false)
RETURNS TABLE(item_id uuid,item_name varchar,sale_price numeric,item_category_id uuid,uom_id uuid,image_path varchar,product_notes varchar,is_active boolean,is_stocked boolean,quantity_on_hand bigint)
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE(public.authorize('stock.read'),false)
    OR NOT COALESCE(public.authorize('products.read'),false) THEN
    RAISE EXCEPTION 'You do not have permission to view item inventory' USING ERRCODE='42501';
  END IF;
  RETURN QUERY SELECT i.item_id,i.item_name,i.sale_price,i.item_category_id,i.uom_id,i.image_path,
    i.product_notes,i.is_active,COALESCE(s.quantity,0)>0,COALESCE(s.quantity,0)
  FROM public.item i LEFT JOIN (
    SELECT st.item_id,SUM(st.quantity_at_hand)::bigint quantity FROM public.stock st GROUP BY st.item_id
  ) s ON s.item_id=i.item_id
  WHERE i.is_active OR COALESCE(p_include_inactive,false)
  ORDER BY i.item_name,i.item_id;
END;
$$;
REVOKE ALL ON FUNCTION public.get_admin_items_with_stock(boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_items_with_stock(boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_item(
  p_item_name text,p_sale_price numeric,p_category_id uuid,p_uom_id uuid,p_product_notes text,
  p_image_path text DEFAULT NULL,p_item_id uuid DEFAULT NULL,p_is_active boolean DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_item_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE(public.authorize(
    CASE WHEN p_item_id IS NULL THEN 'products.create'::public.app_permission ELSE 'products.update'::public.app_permission END),false) THEN
    RAISE EXCEPTION 'You do not have permission to save this item' USING ERRCODE='42501';
  END IF;
  IF NULLIF(btrim(p_item_name),'') IS NULL THEN RAISE EXCEPTION 'Item name is required' USING ERRCODE='22023'; END IF;
  IF p_sale_price IS NULL OR p_sale_price < 0 OR p_sale_price='NaN'::numeric THEN RAISE EXCEPTION 'Invalid sale price' USING ERRCODE='22023'; END IF;
  IF p_item_id IS NULL THEN
    INSERT INTO public.item(item_name,sale_price,item_category_id,uom_id,product_notes,image_path,is_active,is_stocked,added_by)
    VALUES (btrim(p_item_name),p_sale_price,p_category_id,p_uom_id,p_product_notes,p_image_path,COALESCE(p_is_active,true),false,auth.uid())
    RETURNING item.item_id INTO v_item_id;
  ELSE
    UPDATE public.item SET item_name=btrim(p_item_name),sale_price=p_sale_price,item_category_id=p_category_id,
      uom_id=p_uom_id,product_notes=p_product_notes,image_path=p_image_path,is_active=COALESCE(p_is_active,item.is_active),
      updated_by=auth.uid(),updated_on=now()
    WHERE item.item_id=p_item_id RETURNING item.item_id INTO v_item_id;
    IF v_item_id IS NULL THEN RAISE EXCEPTION 'Item not found or inaccessible' USING ERRCODE='P0002'; END IF;
  END IF;
  RETURN v_item_id;
END;
$$;
REVOKE ALL ON FUNCTION public.save_item(text,numeric,uuid,uuid,text,text,uuid,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_item(text,numeric,uuid,uuid,text,text,uuid,boolean) TO authenticated;
COMMENT ON COLUMN public.item.is_stocked IS 'Legacy cache; storefront/admin RPCs calculate availability from SUM(stock.quantity_at_hand). Do not use this column to authorize checkout.';
COMMIT;
