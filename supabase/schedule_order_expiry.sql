-- Already installed through the recorded order_expiry_schedule migration.
-- Run only to update the named schedule after changing its frequency.
-- Cron is separate so local tests and migration review do not require pg_cron.
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('little-luxe-expire-orders','* * * * *',
 $$SELECT order_private.expire_received_orders();$$);
-- To use hourly housekeeping instead: replace '* * * * *' with '0 * * * *'.
-- On-demand expiry in order creation and status changes remains active either way.
