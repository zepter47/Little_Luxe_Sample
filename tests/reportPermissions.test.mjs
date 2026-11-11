import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
const migration = fs.readFileSync('supabase/migrations/20261111002106_sales_report_allocation_read.sql', 'utf8');
test('report allocation reads obey grants, role, permissions, delivery status and write restrictions', async () => {
    const db = new PGlite();
    try {
        await db.exec(`
          CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth;
          CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
            $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
          CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS
            $$ SELECT current_setting('request.jwt.claims',true)::jsonb $$;
          CREATE FUNCTION public.authorize(text) RETURNS boolean LANGUAGE sql STABLE AS
            $$ SELECT coalesce((auth.jwt()->'permissions') ? $1,false) $$;
          GRANT USAGE ON SCHEMA auth TO authenticated,anon;
          CREATE TABLE public."order"(order_id int PRIMARY KEY,order_status text);
          CREATE TABLE public.order_details(order_details_id int PRIMARY KEY,order_id int REFERENCES public."order");
          CREATE TABLE public.stock_reservation(order_details_id int REFERENCES public.order_details,
            stock_id int,quantity_reserved int,reservation_status text,created_at timestamptz);
          ALTER TABLE public.stock_reservation ENABLE ROW LEVEL SECURITY;
          CREATE POLICY reservation_no_client_access ON public.stock_reservation
            FOR ALL TO authenticated,anon USING(false) WITH CHECK(false);
          GRANT SELECT ON public."order",public.order_details TO authenticated;
          INSERT INTO public."order" VALUES(1,'delivered'),(2,'received');
          INSERT INTO public.order_details VALUES(1,1),(2,2);
          INSERT INTO public.stock_reservation VALUES(1,1,2,'fulfilled',now()),
            (2,2,2,'active',now()),(2,3,1,'fulfilled',now());
        `);
        await db.exec(migration);
        await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false)`);
        for (const [role, permissions, anonymous, count] of [
            ['staff',['orders.read','stock.read'],false,1],
            ['admin',['orders.read','stock.read'],false,1],
            ['customer',['orders.read','stock.read'],false,0],
            ['staff',['orders.read'],false,0],
            ['staff',['stock.read'],false,0],
            ['staff',['orders.read','stock.read'],true,0],
        ]) {
            await db.query(`select set_config('request.jwt.claims',$1,false)`,[JSON.stringify({user_role:role,permissions,is_anonymous:anonymous})]);
            assert.equal((await db.query('select order_details_id,stock_id,quantity_reserved,reservation_status from stock_reservation')).rows.length,count);
        }
        for (const query of ['select created_at from stock_reservation', "update stock_reservation set quantity_reserved=1", "delete from stock_reservation", "insert into stock_reservation(order_details_id) values(1)"]) {
            await assert.rejects(db.query(query), /permission denied/);
        }
        await db.exec('RESET ROLE; SET ROLE anon');
        await assert.rejects(db.query('select stock_id from stock_reservation'), /permission denied/);
    } finally { await db.close(); }
});
