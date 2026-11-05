import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
const { PGlite } = await import(
  process.env.PGLITE_MODULE || "@electric-sql/pglite"
);
const sql = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const migration = (name) => {
  const path = readdirSync(new URL("../migrations/", import.meta.url)).find(
    (p) => p.endsWith("_" + name + ".sql"),
  );
  assert.ok(path, `Missing migration ${name}`);
  return sql("../migrations/" + path);
};
const customer = "11111111-1111-4111-8111-111111111111",
  staff = "22222222-2222-4222-8222-222222222222";
const item = "33333333-3333-4333-8333-333333333333";
const shared = new PGlite();
await shared.exec(sql("./fixtures/order_base.sql"));
await shared.exec(migration("order_reservations"));
// Existing users test migration backfill; new users test the signup trigger.
await shared.query("insert into auth.users(id,email) values($1,$2)", [
  customer,
  "customer@example.test",
]);
await shared.exec(migration("customer_auth_accounts"));
await shared.exec(migration("order_access_review"));
await shared.exec(`
  ALTER TYPE public.app_permission ADD VALUE 'products.create';
  ALTER TABLE public.item ADD COLUMN is_stocked boolean DEFAULT false,
    ADD COLUMN added_by uuid, ADD COLUMN updated_by uuid, ADD COLUMN updated_on timestamptz;
`);
await shared.exec(process.env.DISCOUNT_MIGRATION_PATH
  ? readFileSync(process.env.DISCOUNT_MIGRATION_PATH, 'utf8') : migration('whole_ugx_discounts'));

assert.equal(
  (
    await shared.query(
      "select customer_id from customer where customer_id=$1",
      [customer],
    )
  ).rows.length,
  1,
);
after(() => shared.close());
async function setup() {
  const db = shared;
  await db.exec(
    'reset role; truncate order_private.requests,order_status_history,stock_reservation,order_details,"order",customer,stock,item,auth.users restart identity cascade',
  );
  await db.query(
    "insert into item(item_id,item_name,sale_price) values($1,$2,20)",
    [item, "Dress"],
  );
  await db.query(
    "insert into stock(item_id,quantity_at_hand,cost_price,batch_number) values($1,4,5,$2),($1,6,8,$3)",
    [item, "A", "B"],
  );
  await db.query("insert into auth.users(id,email) values($1,$2),($3,$4)", [
    customer,
    "customer@example.test",
    staff,
    "staff@example.test",
  ]);
  return db;
}
async function actor(db, id, role = "customer") {
  await db.exec("reset role");
  await db.query(
    "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",
    [id, JSON.stringify({ user_role: role })],
  );
  await db.exec("set role authenticated");
}
const lines = (quantity = 3, price = 20) =>
  JSON.stringify([{ item_id: item, quantity, sale_price: price }]);
async function online(db, quantity = 3, key = randomUUID(), price = 20) {
  return (
    await db.query("select create_online_order($1::jsonb,$2::uuid) id", [
      lines(quantity, price),
      key,
    ])
  ).rows[0].id;
}
async function totals(db) {
  await db.exec("reset role");
  return (
    await db.query(
      "select sum(quantity_at_hand)::int physical,sum(quantity_reserved)::int reserved from stock",
    )
  ).rows[0];
}
async function change(db, id, status, reason = "Test decline") {
  return (
    await db.query("select update_order_status($1,$2,$3) result", [
      id,
      status,
      reason,
    ])
  ).rows[0].result;
}
async function age(db, id) {
  await db.exec("reset role");
  await db.query(
    "update public.\"order\" set expected_expiry_date=clock_timestamp()-interval '1 second' where order_id=$1",
    [id],
  );
}

test("online identity, multi-batch reservations and server idempotency", async () => {
  const db = await setup();
  try {
    await actor(db, customer);
    const key = randomUUID(),
      id = await online(db, 7, key);
    assert.equal(await online(db, 7, key), id);
    assert.deepEqual(await totals(db), { physical: 10, reserved: 7 });
    const o = (await db.query('select * from "order"')).rows[0];
    assert.equal(o.customer_id, customer);
    assert.equal(o.added_by, customer);
    assert.equal(o.order_origin, "online");
    assert.ok(
      new Date(o.expected_expiry_date) - new Date(o.added_on) >=
        12 * 3600000 - 100,
    );
    assert.equal(
      (await db.query("select * from stock_reservation")).rows.length,
      2,
    );
    await actor(db, customer);
    await assert.rejects(() => online(db, 6, key), /different order/);
    await assert.rejects(() => change(db, id, "processed"), /Staff permission/);
  } finally {
    await db.exec("reset role");
  }
});

test("all discrepancies reject atomically; cleanup rolls back with a rejected checkout", async () => {
  const db = await setup();
  try {
    await actor(db, customer);
    const old = await online(db, 8);
    await age(db, old);
    await actor(db, customer);
    await assert.rejects(
      () => online(db, 9, randomUUID(), 19),
      (e) => JSON.parse(e.detail).some((i) => i.code === "PRICE_CHANGED"),
    );
    assert.deepEqual(await totals(db), { physical: 10, reserved: 8 });
    assert.equal(
      (
        await db.query('select order_status from "order" where order_id=$1', [
          old,
        ])
      ).rows[0].order_status,
      "received",
    );
    await actor(db, customer);
    await online(db, 9);
    assert.deepEqual(await totals(db), { physical: 10, reserved: 9 });
    assert.equal(
      (
        await db.query('select order_status from "order" where order_id=$1', [
          old,
        ])
      ).rows[0].order_status,
      "declined",
    );
  } finally {
    await db.exec("reset role");
  }
});

test("online transitions, shipped decline, and repeated delivery never double-deduct", async () => {
  const db = await setup();
  try {
    await actor(db, customer);
    const id = await online(db);
    await actor(db, staff, "staff");
    await assert.rejects(() => change(db, id, "delivered"), /Invalid order/);
    await change(db, id, "processed");
    await change(db, id, "shipped");
    await change(db, id, "delivered");
    await change(db, id, "delivered");
    assert.deepEqual(await totals(db), { physical: 7, reserved: 0 });
    await actor(db, staff, "staff");
    await assert.rejects(() => change(db, id, "declined"), /Invalid order/);
    await actor(db, customer);
    const second = await online(db, 2);
    await actor(db, staff, "staff");
    await change(db, second, "processed");
    await change(db, second, "shipped");
    await change(db, second, "declined");
    assert.deepEqual(await totals(db), { physical: 7, reserved: 0 });
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from order_status_history where order_id=$1 and new_status='delivered'",
          [id],
        )
      ).rows[0].n,
      1,
    );
  } finally {
    await db.exec("reset role");
  }
});

test("staff selects existing customer; cash sale bypasses processing/shipping", async () => {
  const db = await setup();
  try {
    await actor(db, customer);
    await assert.rejects(
      () =>
        db.query("select create_staff_order($1,$2::jsonb,$3)", [
          customer,
          lines(),
          randomUUID(),
        ]),
      /Staff permission/,
    );
    await actor(db, staff, "staff");
    await assert.rejects(
      () =>
        db.query("select create_staff_order($1,$2::jsonb,$3)", [
          randomUUID(),
          lines(),
          randomUUID(),
        ]),
      /existing active customer/,
    );
    const cid = (await db.query("select save_customer('Walk','In') id")).rows[0]
      .id;
    const id = (
      await db.query("select create_staff_order($1,$2::jsonb,$3) id", [
        cid,
        lines(),
        randomUUID(),
      ])
    ).rows[0].id;
    await assert.rejects(() => change(db, id, "processed"), /Invalid order/);
    await change(db, id, "delivered");
    assert.deepEqual(await totals(db), { physical: 7, reserved: 0 });
    const row = (
      await db.query(
        'select customer_id,added_by from "order" where order_id=$1',
        [id],
      )
    ).rows[0];
    assert.equal(row.customer_id, cid);
    assert.equal(row.added_by, staff);
  } finally {
    await db.exec("reset role");
  }
});

test("expiry is received-only; expiry during a staff action commits its audit and release", async () => {
  const db = await setup();
  try {
    await actor(db, customer);
    const expired = await online(db, 3);
    const processed = await online(db, 2);
    await actor(db, staff, "staff");
    await change(db, processed, "processed");
    await age(db, expired);
    await age(db, processed);
    await actor(db, staff, "staff");
    assert.equal((await change(db, expired, "processed")).outcome, "expired");
    assert.deepEqual(await totals(db), { physical: 10, reserved: 2 });
    assert.equal(
      (
        await db.query('select order_status from "order" where order_id=$1', [
          processed,
        ])
      ).rows[0].order_status,
      "processed",
    );
    assert.equal(
      (await db.query("select order_private.expire_received_orders() n"))
        .rows[0].n,
      0,
    );
  } finally {
    await db.exec("reset role");
  }
});

test("permissions prevent bypasses and hide other customers orders and staff notes", async () => {
  const db = await setup();
  try {
    await actor(db, customer);
    const id = await online(db, 2);
    await assert.rejects(
      () =>
        db.query(
          "update public.\"order\" set order_status='delivered' where order_id=$1",
          [id],
        ),
      /permission denied/,
    );
    await assert.rejects(
      () => db.query("update order_details set quantity_sold=999"),
      /permission denied/,
    );
    await assert.rejects(
      () => db.query("select order_private.expire_received_orders()"),
      /permission denied/,
    );
    await assert.rejects(
      () => db.query("select * from stock_reservation"),
      /permission denied/,
    );
    assert.equal(
      (await db.query("select * from order_status_history")).rows.length,
      0,
    );
    await actor(db, staff, "staff");
    await assert.rejects(
      () => db.exec("update stock set quantity_reserved=0"),
      /Reservations must/,
    );
    await actor(db, randomUUID());
    assert.equal((await db.query('select * from "order"')).rows.length, 0);
    await assert.rejects(
      () => db.query("select get_order_timeline($1)", [id]),
      /access denied/,
    );
    await actor(db, customer);
    const events = await db.query("select * from get_order_timeline($1)", [id]);
    assert.equal(events.rows.length, 1);
    assert.ok(!("changed_by" in events.rows[0]));
  } finally {
    await db.exec("reset role");
  }
});

test("invalid inputs and insufficient stock leave no orders or history", async () => {
  const db = await setup();
  try {
    await actor(db, customer);
    await assert.rejects(
      () => online(db, 11),
      (e) => e.detail.includes("INSUFFICIENT_STOCK"),
    );
    await assert.rejects(() => online(db, 0), /Invalid items/);
    await assert.rejects(
      () =>
        db.query("select create_online_order($1::jsonb,$2)", [
          JSON.stringify([
            { item_id: item, quantity: 1, sale_price: 20 },
            { item_id: item, quantity: 1, sale_price: 20 },
          ]),
          randomUUID(),
        ]),
      /Duplicate items/,
    );
    assert.deepEqual(await totals(db), { physical: 10, reserved: 0 });
    assert.equal(
      (await db.query('select count(*)::int n from "order"')).rows[0].n,
      0,
    );
    assert.equal(
      (await db.query("select count(*)::int n from order_status_history"))
        .rows[0].n,
      0,
    );
  } finally {
    await db.exec("reset role");
  }
});

test("on-demand expiry drains more than one batch and preserves reservation totals", async () => {
  const db = await setup();
  try {
    await db.exec("update stock set quantity_at_hand=200");
    await actor(db, customer);
    for (let n = 0; n < 101; n++) await online(db, 1);
    await db.exec(
      "reset role; update public.\"order\" set expected_expiry_date=clock_timestamp()-interval '1 second'",
    );
    await actor(db, customer);
    await online(db, 4);
    assert.deepEqual(await totals(db), { physical: 400, reserved: 4 });
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from public.\"order\" where order_status='declined'",
        )
      ).rows[0].n,
      101,
    );
    assert.equal(
      (
        await db.query(
          "select count(*)::int n from stock st where st.quantity_reserved <> (select coalesce(sum(sr.quantity_reserved),0) from stock_reservation sr where sr.stock_id=st.stock_id and sr.reservation_status='active')",
        )
      ).rows[0].n,
      0,
    );
  } finally {
    await db.exec("reset role");
  }
});

test("anonymous calls cannot create orders", async () => {
  const db = await setup();
  try {
    await actor(db, "");
    await assert.rejects(() => online(db), /Authentication required/);
    await db.exec("reset role");
    await db.query(
      "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",
      [customer, JSON.stringify({ is_anonymous: true })],
    );
    await db.exec("set role authenticated");
    await assert.rejects(() => online(db), /Authentication required/);
  } finally {
    await db.exec("reset role");
  }
});

test("signup provisions a matching customer and keeps names/contact synchronized", async () => {
  const db = await setup();
  try {
    const id = randomUUID();
    await db.query(
      "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
      [
        id,
        "new@example.test",
        JSON.stringify({ first_name: "New", last_name: "Shopper" }),
      ],
    );
    let c = (
      await db.query("select * from customer where customer_id=$1", [id])
    ).rows[0];
    assert.equal(c.customer_origin, "account");
    assert.equal(c.first_name, "New");
    assert.equal(c.added_by, id);
    await db.query("update auth.users set email=$2 where id=$1", [
      id,
      "updated@example.test",
    ]);
    c = (await db.query("select * from customer where customer_id=$1", [id]))
      .rows[0];
    assert.equal(c.email, "updated@example.test");
    await actor(db, id);
    assert.equal(
      (await db.query("select customer_id from customer")).rows.length,
      1,
    );
    await online(db, 1);
  } finally {
    await db.exec("reset role");
  }
});

test("anonymous conversion provisions a customer only when the account becomes permanent", async () => {
  const db = await setup();
  try {
    const id = randomUUID();
    await db.query("insert into auth.users(id,is_anonymous) values($1,true)", [
      id,
    ]);
    assert.equal(
      (await db.query("select * from customer where customer_id=$1", [id])).rows
        .length,
      0,
    );
    await db.query(
      "update auth.users set is_anonymous=false,email='converted@example.test' where id=$1",
      [id],
    );
    assert.equal(
      (await db.query("select * from customer where customer_id=$1", [id])).rows
        .length,
      1,
    );
  } finally {
    await db.exec("reset role");
  }
});

test("order foreign key rejects nonexistent customers and protects referenced customer records", async () => {
  const db = await setup();
  try {
    await actor(db, customer);
    const id = await online(db, 1);
    await db.exec("reset role");
    await assert.rejects(
      () =>
        db.query(
          'update public."order" set customer_id=$1,added_by=$1 where order_id=$2',
          [randomUUID(), id],
        ),
      /foreign key/,
    );
    await assert.rejects(
      () => db.query("delete from customer where customer_id=$1", [customer]),
      /foreign key/,
    );
  } finally {
    await db.exec("reset role");
  }
});

test("staff registration generates an independent UUID; inactive online accounts cannot order", async () => {
  const db = await setup();
  try {
    await actor(db, staff, "staff");
    const id = (await db.query("select save_customer('Walk','In') id")).rows[0]
      .id;
    await db.exec("reset role");
    assert.notEqual(id, staff);
    assert.equal(
      (
        await db.query(
          "select customer_origin from customer where customer_id=$1",
          [id],
        )
      ).rows[0].customer_origin,
      "staff",
    );
    assert.equal(
      (await db.query("select * from auth.users where id=$1", [id])).rows
        .length,
      0,
    );
    await db.query("update customer set is_active=false where customer_id=$1", [
      customer,
    ]);
    await actor(db, customer);
    await assert.rejects(() => online(db), /account is unavailable/);
  } finally {
    await db.exec("reset role");
  }
});

test('online discounts use catalogue pricing, round UGX, and preserve snapshots and retries', async () => {
  const db = await setup();
  await db.exec('update item set sale_price=999,item_discount=15');
  await actor(db, customer);
  const key=randomUUID();
  const payload=JSON.stringify([{item_id:item,quantity:2,sale_price:849,original_sale_price:999,order_discount:15}]);
  const id=(await db.query('select create_online_order($1::jsonb,$2) id',[payload,key])).rows[0].id;
  await db.exec('reset role; update item set sale_price=1200,item_discount=50');
  await actor(db, customer);
  assert.equal((await db.query('select create_online_order($1::jsonb,$2) id',[payload,key])).rows[0].id,id);
  const line=(await db.query('select original_sale_price,order_discount,sale_price from order_details where order_id=$1',[id])).rows[0];
  assert.deepEqual(line,{original_sale_price:'999',order_discount:'15',sale_price:'849'});
  await assert.rejects(()=>db.query('select create_online_order($1::jsonb,$2)',[payload,randomUUID()]),e=>e.detail.includes('PRICE_CHANGED'));
  await db.exec('reset role');
  await assert.rejects(()=>db.exec('update order_details set sale_price=0'),/immutable/);
});

test('staff discounts replace catalogue promotions; free items still reserve inventory', async () => {
  const db=await setup();
  await db.exec('update item set sale_price=10000,item_discount=20');
  await actor(db,staff,'staff');
  const request=randomUUID();
  const payload=JSON.stringify([{item_id:item,quantity:1,sale_price:9000,original_sale_price:10000,order_discount:10}]);
  const id=(await db.query('select create_staff_order($1,$2::jsonb,$3) id',[customer,payload,request])).rows[0].id;
  assert.equal((await db.query('select sale_price from order_details where order_id=$1',[id])).rows[0].sale_price,'9000');
  const changed=JSON.stringify([{item_id:item,quantity:1,sale_price:0,original_sale_price:10000,order_discount:100}]);
  await assert.rejects(()=>db.query('select create_staff_order($1,$2::jsonb,$3)',[customer,changed,request]),/different order/);
  const free=(await db.query('select create_staff_order($1,$2::jsonb,$3) id',[customer,changed,randomUUID()])).rows[0].id;
  assert.equal((await db.query('select sale_price from order_details where order_id=$1',[free])).rows[0].sale_price,'0');
  assert.deepEqual(await totals(db),{physical:10,reserved:2});
});

test('discount and snapshot validation rejects tampering without reserving stock', async () => {
  const db=await setup();
  await db.exec('update item set sale_price=10000,item_discount=20');
  await actor(db,customer);
  for (const patch of [{sale_price:7000,order_discount:30},{sale_price:8000,order_discount:30},{sale_price:11000}]) {
    const payload=JSON.stringify([{item_id:item,quantity:1,sale_price:8000,...patch}]);
    await assert.rejects(()=>db.query('select create_online_order($1::jsonb,$2)',[payload,randomUUID()]),e=>e.detail.includes('PRICE_CHANGED'));
  }
  await actor(db,staff,'staff');
  for (const patch of [{order_discount:-1},{order_discount:101},{order_discount:1.5},{order_discount:null},{sale_price:1.5},{original_sale_price:null}]) {
    const payload=JSON.stringify([{item_id:item,quantity:1,sale_price:10000,order_discount:0,...patch}]);
    await assert.rejects(()=>db.query('select create_staff_order($1,$2::jsonb,$3)',[customer,payload,randomUUID()]),/whole/);
  }
  await assert.rejects(()=>db.query('select create_staff_order($1,$2::jsonb,$3)',[customer,JSON.stringify([{item_id:item,quantity:1,sale_price:10001,order_discount:0}]),randomUUID()]),e=>e.detail.includes('PRICE_CHANGED'));
  assert.deepEqual(await totals(db),{physical:10,reserved:0});
});

test('catalogue constraints and command reject fractional money and invalid discounts', async () => {
  const db=await setup();
  for (const v of [-1,101,1.5]) await assert.rejects(()=>db.query('update item set item_discount=$1',[v]),/check constraint/);
  await assert.rejects(()=>db.exec('update item set sale_price=999.5'),/check constraint/);
  await actor(db,staff,'staff');
  await assert.rejects(()=>db.query("select save_item('Dress',999.5,null,null,'')"),/Invalid sale price/);
  await assert.rejects(()=>db.query("select save_item('Dress',999,null,null,'',p_item_discount=>15.5)"),/whole percentage/);
});

test('online 100 percent discount accepts a free order and staff defaults to zero discount', async () => {
  const db=await setup();
  await db.exec('update item set item_discount=100');
  await actor(db,customer);
  const free=await online(db,1,randomUUID(),0);
  assert.equal((await db.query('select sale_price from order_details where order_id=$1',[free])).rows[0].sale_price,'0');
  await actor(db,staff,'staff');
  const full=(await db.query('select create_staff_order($1,$2::jsonb,$3) id',[customer,lines(1),randomUUID()])).rows[0].id;
  const row=(await db.query('select original_sale_price,order_discount,sale_price from order_details where order_id=$1',[full])).rows[0];
  assert.deepEqual(row,{original_sale_price:'20',order_discount:'0',sale_price:'20'});
});

test('new lines require an original-price snapshot; staff price refresh detects stale originals', async () => {
  const db=await setup();
  await assert.rejects(()=>db.query('insert into order_details(item_id,sale_price,quantity_sold) values($1,0,1)',[item]),/snapshot is required/);
  await actor(db,staff,'staff');
  const payload=JSON.stringify([{item_id:item,quantity:1,original_sale_price:19,order_discount:100,sale_price:0}]);
  await assert.rejects(()=>db.query('select create_staff_order($1,$2::jsonb,$3)',[customer,payload,randomUUID()]),e=>e.detail.includes('PRICE_CHANGED'));
  assert.deepEqual(await totals(db),{physical:10,reserved:0});
});
