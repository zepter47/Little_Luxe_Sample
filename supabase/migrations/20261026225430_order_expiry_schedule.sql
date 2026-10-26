-- Recorded Supabase migration: order_expiry_schedule.
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('little-luxe-expire-orders','* * * * *',
 $$SELECT order_private.expire_received_orders();$$);
