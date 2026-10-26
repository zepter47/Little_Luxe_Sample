-- Isolated PostgreSQL fixture matching the inspected inventory schema.
-- Never run against a hosted database.
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
CREATE SCHEMA private;
GRANT USAGE ON SCHEMA auth TO authenticated;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO authenticated;
CREATE TYPE public.order_status AS ENUM ('received','processed','shipped','delivered','declined');
CREATE TYPE public.app_permission AS ENUM ('orders.read','orders.create','orders.update','products.update','stock.read','products.read');
CREATE FUNCTION public.authorize(public.app_permission) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT coalesce(auth.jwt()->>'user_role','') IN ('staff','admin') $$;
CREATE TABLE public.item(item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),item_name varchar NOT NULL,sale_price numeric,is_active boolean DEFAULT true,item_category_id uuid,uom_id uuid,image_path varchar,product_notes varchar);
CREATE TABLE public.stock(stock_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),item_id uuid NOT NULL REFERENCES public.item,batch_number varchar,expiry_date date,quantity_at_hand integer,cost_price numeric NOT NULL);
CREATE TABLE public."order"(order_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),added_by uuid,added_on timestamptz DEFAULT now(),order_notes varchar,order_status public.order_status DEFAULT 'received',updated_on timestamptz,updated_by uuid,is_active boolean);
CREATE TABLE public.order_details(order_details_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),order_id uuid REFERENCES public."order",item_id uuid REFERENCES public.item,sale_price numeric,quantity_sold integer,batch_number varchar,expiry_date date);
ALTER TABLE public."order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_read_order ON public."order" FOR SELECT TO authenticated USING(public.authorize('orders.read'));
CREATE POLICY staff_read_details ON public.order_details FOR SELECT TO authenticated USING(public.authorize('orders.read'));
CREATE POLICY staff_stock ON public.stock TO authenticated USING(public.authorize('orders.update')) WITH CHECK(public.authorize('orders.update'));
GRANT SELECT,INSERT,UPDATE,DELETE ON public."order",public.order_details,public.stock TO authenticated;
GRANT SELECT ON public.item TO authenticated;
