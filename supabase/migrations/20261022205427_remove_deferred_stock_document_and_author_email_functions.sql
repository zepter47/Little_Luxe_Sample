-- Orders, purchases and returns will be redesigned separately.
-- RESTRICT prevents unrelated dependent objects from being removed.
BEGIN;
DROP FUNCTION IF EXISTS public.stock_author_emails(uuid[]) RESTRICT;
DROP FUNCTION IF EXISTS private.stock_author_emails(uuid[]) RESTRICT;
DROP FUNCTION IF EXISTS public.create_stock_document(text,jsonb,jsonb) RESTRICT;
COMMIT;
