-- Reports need fulfilled allocations to calculate batch-weighted costs.
-- Keep operational reservations private and all direct client writes revoked.
BEGIN;
GRANT SELECT (order_details_id, stock_id, quantity_reserved, reservation_status)
  ON public.stock_reservation TO authenticated;
CREATE POLICY reservation_staff_report_read ON public.stock_reservation
  FOR SELECT TO authenticated USING (
    (SELECT auth.uid()) IS NOT NULL
    AND NOT coalesce(((SELECT auth.jwt())->>'is_anonymous')::boolean, false)
    AND ((SELECT auth.jwt())->>'user_role') IN ('staff', 'admin')
    AND (SELECT public.authorize('orders.read'))
    AND (SELECT public.authorize('stock.read'))
    AND reservation_status = 'fulfilled'
    AND EXISTS (
      SELECT 1 FROM public.order_details d
      JOIN public."order" o ON o.order_id = d.order_id
      WHERE d.order_details_id = stock_reservation.order_details_id
        AND o.order_status = 'delivered'
    )
  );
COMMIT;
