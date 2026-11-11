BEGIN;
ALTER TABLE public.stock_reservation ADD COLUMN unit_cost_price numeric
  CHECK (unit_cost_price >= 0 AND unit_cost_price::text NOT IN ('NaN','Infinity','-Infinity'));
-- Preserve a cost independently of the stock FK, which may be cleared on depletion.
CREATE FUNCTION order_private.snapshot_reservation_cost() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF NEW.unit_cost_price IS NULL AND NEW.stock_id IS NOT NULL THEN
   SELECT s.cost_price INTO NEW.unit_cost_price FROM public.stock s WHERE s.stock_id=NEW.stock_id;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER snapshot_reservation_cost BEFORE INSERT OR UPDATE ON public.stock_reservation
 FOR EACH ROW EXECUTE FUNCTION order_private.snapshot_reservation_cost();
REVOKE ALL ON FUNCTION order_private.snapshot_reservation_cost() FROM PUBLIC,anon,authenticated;
UPDATE public.stock_reservation r SET unit_cost_price=s.cost_price
 FROM public.stock s WHERE s.stock_id=r.stock_id;
-- Recover deleted batches only when every matching purchase before reservation
-- agrees on cost. Ambiguous history remains explicitly unknown; never guess.
UPDATE public.stock_reservation r SET unit_cost_price=(
 SELECT min(p.cost_price) FROM public.purchase_details p
 JOIN public.purchase h USING(purchase_id)
 JOIN public.order_details d ON d.order_details_id=r.order_details_id
 WHERE p.item_id=d.item_id AND p.batch_number IS NOT DISTINCT FROM d.batch_number
 AND p.expiry_date IS NOT DISTINCT FROM d.expiry_date AND h.added_on<=r.created_at
 HAVING count(*)>0 AND min(p.cost_price)=max(p.cost_price)
) WHERE r.unit_cost_price IS NULL;
GRANT SELECT (unit_cost_price) ON public.stock_reservation TO authenticated;
COMMIT;
