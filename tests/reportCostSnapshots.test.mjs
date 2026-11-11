import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
test('sale costs survive depleted stock deletion and historical recovery rejects ambiguous costs', async () => {
    const db = new PGlite();
    try {
        await db.exec(`
          CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA order_private;
          CREATE TABLE stock(stock_id int PRIMARY KEY,cost_price numeric);
          CREATE TABLE order_details(order_details_id int PRIMARY KEY,item_id int,batch_number text,expiry_date date);
          CREATE TABLE purchase(purchase_id int PRIMARY KEY,added_on timestamptz);
          CREATE TABLE purchase_details(purchase_id int,item_id int,cost_price numeric,batch_number text,expiry_date date);
          CREATE TABLE stock_reservation(order_details_id int,stock_id int REFERENCES stock ON DELETE SET NULL,created_at timestamptz);
          INSERT INTO stock VALUES(1,5200);
          INSERT INTO order_details VALUES(1,1,null,null),(2,2,null,null),(3,3,null,null);
          INSERT INTO purchase VALUES(1,'2026-01-01');
          INSERT INTO purchase_details VALUES(1,2,4600,null,null),(1,2,4600,null,null),(1,3,100,null,null),(1,3,200,null,null);
          INSERT INTO stock_reservation VALUES(1,1,'2026-02-01'),(2,null,'2026-02-01'),(3,null,'2026-02-01');
        `);
        await db.exec(fs.readFileSync('supabase/migrations/20261111003803_report_sale_cost_snapshots.sql','utf8'));
        let rows=(await db.query('select unit_cost_price from stock_reservation order by order_details_id')).rows;
        assert.deepEqual(rows.map(row=>row.unit_cost_price),['5200','4600',null]);
        await db.exec('DELETE FROM stock WHERE stock_id=1');
        assert.equal((await db.query('select unit_cost_price from stock_reservation where order_details_id=1')).rows[0].unit_cost_price,'5200');
        await db.exec("INSERT INTO stock VALUES(2,8300); INSERT INTO stock_reservation VALUES(1,2,now(),null)");
        assert.equal((await db.query('select unit_cost_price from stock_reservation where stock_id=2')).rows[0].unit_cost_price,'8300');
    } finally {await db.close();}
});
