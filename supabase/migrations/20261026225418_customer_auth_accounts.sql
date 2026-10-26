BEGIN;
-- Account records may have no names yet (email-only sign-up). Staff registration
-- still requires both names in save_customer. Never invent names during backfill.
ALTER TABLE public.customer ALTER COLUMN first_name DROP NOT NULL,
 ALTER COLUMN last_name DROP NOT NULL,
 ADD COLUMN customer_origin text NOT NULL DEFAULT 'staff' CHECK(customer_origin IN ('account','staff'));

CREATE FUNCTION order_private.provision_account_customer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF coalesce(NEW.is_anonymous,false) THEN RETURN NEW; END IF;
 INSERT INTO public.customer(customer_id,first_name,last_name,email,phone_number,added_by,customer_origin)
 VALUES(NEW.id,nullif(btrim(NEW.raw_user_meta_data->>'first_name'),''),nullif(btrim(NEW.raw_user_meta_data->>'last_name'),''),NEW.email,nullif(NEW.phone,''),NEW.id,'account')
 ON CONFLICT(customer_id) DO UPDATE SET
  email=EXCLUDED.email,phone_number=EXCLUDED.phone_number,
  first_name=coalesce(EXCLUDED.first_name,customer.first_name),
  last_name=coalesce(EXCLUDED.last_name,customer.last_name)
 WHERE customer.customer_origin='account';
 IF NOT FOUND THEN RAISE EXCEPTION 'Customer identifier conflicts with an existing staff record.'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION order_private.provision_account_customer() FROM PUBLIC,anon,authenticated;
-- Same transaction as account creation; also provisions anonymous accounts when
-- converted to permanent accounts. Metadata supplies display names only, never roles.
CREATE TRIGGER on_auth_user_customer AFTER INSERT OR UPDATE OF email,phone,raw_user_meta_data,is_anonymous
 ON auth.users FOR EACH ROW EXECUTE FUNCTION order_private.provision_account_customer();
INSERT INTO public.customer(customer_id,first_name,last_name,email,phone_number,added_by,customer_origin)
 SELECT u.id,nullif(btrim(u.raw_user_meta_data->>'first_name'),''),nullif(btrim(u.raw_user_meta_data->>'last_name'),''),u.email,nullif(u.phone,''),u.id,'account'
 FROM auth.users u WHERE NOT coalesce(u.is_anonymous,false)
 ON CONFLICT(customer_id) DO NOTHING;

-- Preserve historical orders by refusing ambiguous orphan IDs instead of guessing.
ALTER TABLE public."order" ADD CONSTRAINT order_customer_id_fkey
 FOREIGN KEY(customer_id) REFERENCES public.customer(customer_id) ON DELETE RESTRICT;
CREATE POLICY customer_account_read ON public.customer FOR SELECT TO authenticated
 USING(customer_origin='account' AND customer_id=(SELECT auth.uid()));
CREATE OR REPLACE FUNCTION public.create_online_order(p_items_json jsonb,p_request_id uuid,p_order_notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR coalesce((auth.jwt()->>'is_anonymous')::boolean,false) THEN RAISE EXCEPTION 'Authentication required.' USING ERRCODE='28000'; END IF;
 PERFORM order_private.lock_inventory();
 PERFORM customer_id FROM public.customer WHERE customer_id=auth.uid() AND customer_origin='account' AND is_active FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Your customer account is unavailable. Please contact the store.'; END IF;
 RETURN order_private.reserve_order(auth.uid(),'online',p_items_json,p_request_id,p_order_notes);
END $$;
-- Origin is database-controlled. Staff edits preserve it and cannot impersonate
-- account records by choosing their customer UUID at registration.
CREATE OR REPLACE FUNCTION public.save_customer(p_first_name text,p_last_name text,p_email text DEFAULT NULL,
 p_phone_number text DEFAULT NULL,p_address text DEFAULT NULL,p_customer_notes text DEFAULT NULL,
 p_customer_id uuid DEFAULT NULL,p_is_active boolean DEFAULT true)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid;
BEGIN
 IF NOT order_private.staff_allowed('orders.create') THEN RAISE EXCEPTION 'Staff permission required.' USING ERRCODE='42501'; END IF;
 IF nullif(btrim(p_first_name),'') IS NULL OR nullif(btrim(p_last_name),'') IS NULL THEN RAISE EXCEPTION 'Customer first and last names are required.'; END IF;
 IF p_customer_id IS NULL THEN
  INSERT INTO public.customer(first_name,last_name,email,phone_number,address,customer_notes,added_by,customer_origin)
  VALUES(btrim(p_first_name),btrim(p_last_name),nullif(btrim(p_email),''),nullif(btrim(p_phone_number),''),nullif(btrim(p_address),''),p_customer_notes,auth.uid(),'staff') RETURNING customer_id INTO v_id;
 ELSE
  UPDATE public.customer SET first_name=btrim(p_first_name),last_name=btrim(p_last_name),email=nullif(btrim(p_email),''),phone_number=nullif(btrim(p_phone_number),''),address=nullif(btrim(p_address),''),customer_notes=p_customer_notes,is_active=coalesce(p_is_active,true),updated_by=auth.uid(),updated_on=clock_timestamp()
  WHERE customer_id=p_customer_id RETURNING customer_id INTO v_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Customer not found.'; END IF;
 END IF;
 RETURN v_id;
END $$;
CREATE INDEX stock_reservation_stock_idx ON public.stock_reservation(stock_id);
CREATE INDEX order_request_order_idx ON order_private.requests(order_id);
NOTIFY pgrst,'reload schema';
COMMIT;
